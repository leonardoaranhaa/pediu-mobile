import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const user = { id: 20, openId: "customer-20", name: "Cliente", email: "customer@test.local", loginMethod: "test", role: "user" as const, lastSignedIn: new Date() };
const profile = { ...user, createdAt: new Date(), updatedAt: new Date() };
const preferences = { id: 3, userId: 20, pixEnabled: 1, cardEnabled: 0, cashEnabled: 1, updatedAt: new Date() } as any;

describe("Pediu account and privacy contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("updates only the authenticated profile", async () => {
    const update = vi.spyOn(db, "updateUserProfile").mockResolvedValue({ ...profile, name: "Cliente Atualizado" });
    vi.spyOn(db, "getUserProfile").mockResolvedValue(profile);

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.account.profile.update({ name: "Cliente Atualizado", email: "updated@test.local" });

    expect(update).toHaveBeenCalledWith(20, { name: "Cliente Atualizado", email: "updated@test.local" });
    expect(result.name).toBe("Cliente Atualizado");
  });

  it("persists payment preferences for the authenticated user", async () => {
    vi.spyOn(db, "getCustomerPaymentPreferences").mockResolvedValue(preferences);
    const update = vi.spyOn(db, "updateCustomerPaymentPreferences").mockResolvedValue({ ...preferences, cardEnabled: 1 });

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.account.paymentPreferences.update({ cardEnabled: true });

    expect(update).toHaveBeenCalledWith(20, { cardEnabled: 1 });
    expect(result.cardEnabled).toBe(1);
  });

  it("exports only the authenticated user's data package", async () => {
    const exportData = vi.spyOn(db, "exportUserData").mockResolvedValue({ exportedAt: new Date().toISOString(), profile, addresses: [], orders: [], notifications: [], consents: [], supportTickets: [], paymentPreferences: null });

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.experience.privacy.export();

    expect(exportData).toHaveBeenCalledWith(20);
    expect(result.profile.id).toBe(20);
  });

  it("creates an auditable assisted-deletion request instead of deleting immediately", async () => {
    const create = vi.spyOn(db, "createSupportTicket").mockResolvedValue(901);

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.experience.privacy.requestDeletion();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: 20, subject: "Solicitação de exclusão de conta" }));
    expect(result).toEqual({ ticketId: 901, success: true });
  });
});
