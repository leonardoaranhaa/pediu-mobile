import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const admin = {
  id: 1,
  openId: "admin-1",
  name: "Admin",
  email: "admin@test.local",
  loginMethod: "test",
  role: "admin" as const,
  lastSignedIn: new Date(),
};

const merchant = { ...admin, id: 2, openId: "merchant-2", role: "merchant" as const };
const user = { ...admin, id: 3, openId: "user-3", role: "user" as const };

describe("Pediu admin authorization and contracts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows an admin to read users, stores, orders, payments, credit, ledger and audit", async () => {
    vi.spyOn(db, "listAdminUsers").mockResolvedValue([{ id: 10, name: "User", email: "user@test.local", role: "user", loginMethod: "test", createdAt: new Date(), lastSignedIn: new Date() }] as any);
    vi.spyOn(db, "listAdminStores").mockResolvedValue([{ id: 7, name: "Loja", ownerId: 10 }] as any);
    vi.spyOn(db, "listAdminOrders").mockResolvedValue([{ id: 101, storeId: 7, customerId: 10, total: "25.00", status: "Pendente" }] as any);
    vi.spyOn(db, "listAdminPayments").mockResolvedValue([{ id: 201, orderId: 101, method: "pix", status: "pending" }] as any);
    vi.spyOn(db, "listAdminCustomers").mockResolvedValue([{ id: 301, storeId: 7, userId: 10, balance: "5.00" }] as any);
    vi.spyOn(db, "listAdminLedgerEntries").mockResolvedValue([{ id: 401, storeId: 7, customerId: 301, type: "credit", amount: "5.00" }] as any);
    vi.spyOn(db, "listAdminAuditLogs").mockResolvedValue([{ id: 501, actorId: 1, action: "read", entityType: "user" }] as any);
    vi.spyOn(db, "listAdminSupportTickets").mockResolvedValue([{ id: 601, userId: 10, subject: "Ajuda", body: "Preciso de ajuda", status: "open", createdAt: new Date(), updatedAt: new Date() }] as any);
    vi.spyOn(db, "updateSupportTicketStatus").mockResolvedValue(undefined);
    vi.spyOn(db, "createAdminAuditLog").mockResolvedValue(701);

    const caller = appRouter.createCaller({ user: admin } as any);
    const input = { limit: 20, offset: 0 };

    await expect(caller.admin.users(input)).resolves.toHaveLength(1);
    await expect(caller.admin.stores(input)).resolves.toHaveLength(1);
    await expect(caller.admin.orders(input)).resolves.toHaveLength(1);
    await expect(caller.admin.payments(input)).resolves.toHaveLength(1);
    await expect(caller.admin.credit(input)).resolves.toHaveLength(1);
    await expect(caller.admin.ledger(input)).resolves.toHaveLength(1);
    await expect(caller.admin.audit(input)).resolves.toHaveLength(1);
    await expect(caller.admin.support(input)).resolves.toHaveLength(1);
    await expect(caller.admin.supportStatus({ ticketId: 601, status: "in_progress" })).resolves.toEqual({ success: true });
  });

  it("rejects merchant access to every administrative contract", async () => {
    const caller = appRouter.createCaller({ user: merchant } as any);
    const input = { limit: 20, offset: 0 };

    await expect(caller.admin.users(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.stores(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.orders(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects regular user and anonymous access", async () => {
    const input = { limit: 20, offset: 0 };

    await expect(appRouter.createCaller({ user } as any).admin.payments(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller({ user: null } as any).admin.payments(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces pagination limits at the router boundary", async () => {
    const caller = appRouter.createCaller({ user: admin } as any);

    await expect(caller.admin.users({ limit: 101, offset: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.users({ limit: 0, offset: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.users({ limit: 20, offset: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not audit a status change for a missing ticket", async () => {
    vi.spyOn(db, "updateSupportTicketStatus").mockRejectedValue(new Error("Support ticket not found"));
    const audit = vi.spyOn(db, "createAdminAuditLog");
    const caller = appRouter.createCaller({ user: admin } as any);
    await expect(caller.admin.supportStatus({ ticketId: 9999, status: "closed" })).rejects.toThrow("Support ticket not found");
    expect(audit).not.toHaveBeenCalled();
  });
});
