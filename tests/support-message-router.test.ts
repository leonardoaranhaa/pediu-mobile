import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = { id: 20, openId: "customer-20", name: "Cliente", email: "customer@test.local", loginMethod: "test", role: "user" as const, lastSignedIn: new Date() };
const admin = { id: 1, openId: "admin-1", name: "Suporte", email: "support@test.local", loginMethod: "test", role: "admin" as const, lastSignedIn: new Date() };
const ticket = { id: 501, userId: 20, orderId: null, subject: "Ajuda", body: "Preciso de ajuda", status: "open" as const, createdAt: new Date(), updatedAt: new Date() };
const message = { id: 601, ticketId: 501, userId: 20, role: "customer", body: "Olá", idempotencyKey: "support-501-1", readAt: null, createdAt: new Date() } as any;

describe("Pediu support message contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows the ticket owner to list and send messages", async () => {
    vi.spyOn(db, "getSupportTicket").mockResolvedValue(ticket);
    vi.spyOn(db, "listSupportTicketMessages").mockResolvedValue([message]);
    vi.spyOn(db, "getSupportTicketMessageByIdempotencyKey").mockResolvedValue(undefined);
    const create = vi.spyOn(db, "createSupportTicketMessage").mockResolvedValue({ id: 602, duplicate: false });
    const caller = appRouter.createCaller({ user: customer } as any);

    const listed = await caller.pediu.experience.support.messages.list({ ticketId: 501 });
    const sent = await caller.pediu.experience.support.messages.send({ ticketId: 501, body: "Podem verificar?", idempotencyKey: "support-501-2" });

    expect(listed).toHaveLength(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 501, userId: 20, role: "customer" }));
    expect(sent).toEqual({ messageId: 602, duplicate: false });
  });

  it("allows an admin to respond to a customer ticket", async () => {
    vi.spyOn(db, "getSupportTicket").mockResolvedValue(ticket);
    vi.spyOn(db, "getSupportTicketMessageByIdempotencyKey").mockResolvedValue(undefined);
    vi.spyOn(db, "createSupportTicketMessage").mockResolvedValue({ id: 603, duplicate: false });
    const caller = appRouter.createCaller({ user: admin } as any);
    const result = await caller.pediu.experience.support.messages.send({ ticketId: 501, body: "Estamos analisando.", idempotencyKey: "support-501-3" });
    expect(result.messageId).toBe(603);
  });

  it("returns the existing message for a repeated key", async () => {
    vi.spyOn(db, "getSupportTicket").mockResolvedValue(ticket);
    vi.spyOn(db, "getSupportTicketMessageByIdempotencyKey").mockResolvedValue(message);
    const create = vi.spyOn(db, "createSupportTicketMessage").mockResolvedValue({ id: 999, duplicate: false });
    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.support.messages.send({ ticketId: 501, body: "Olá", idempotencyKey: "support-501-1" });
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ messageId: 601, duplicate: true });
  });

  it("rejects another regular user from a ticket", async () => {
    vi.spyOn(db, "getSupportTicket").mockResolvedValue(ticket);
    const caller = appRouter.createCaller({ user: { ...customer, id: 21 } } as any);
    await expect(caller.pediu.experience.support.messages.list({ ticketId: 501 })).rejects.toThrow("não autorizado");
  });
});
