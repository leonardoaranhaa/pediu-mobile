import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as push from "../server/push";

const customer = { id: 20, openId: "customer-20", name: "Cliente", email: "customer@test.local", loginMethod: "test", role: "user" as const, lastSignedIn: new Date() };
const merchant = { id: 10, openId: "merchant-10", name: "Loja", email: "merchant@test.local", loginMethod: "test", role: "merchant" as const, lastSignedIn: new Date() };
const order = { id: 101, customerId: 20, storeId: 7, status: "A caminho" as const, total: "35.00" } as any;
const store = { id: 7, ownerId: 10 } as any;
const message = { id: 301, orderId: 101, userId: 20, role: "customer", body: "Estou aguardando", idempotencyKey: "chat-key-101", readAt: null, createdAt: new Date() } as any;

function prepareParticipant(user: typeof customer | typeof merchant) {
  vi.spyOn(db, "getOrderForUser").mockResolvedValue(order);
  vi.spyOn(db, "getStoreForOwner").mockResolvedValue(user.id === 10 ? store : undefined);
}

describe("Pediu communication contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows the customer to send an idempotent message", async () => {
    prepareParticipant(customer);
    vi.spyOn(db, "getChatMessageByIdempotencyKey").mockResolvedValue(undefined);
    const create = vi.spyOn(db, "createChatMessage").mockResolvedValue({ id: 301, duplicate: false });
    vi.spyOn(db, "getStoreById").mockResolvedValue(store);
    const notify = vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 0 });

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.chat.send({ orderId: 101, body: "Estou aguardando", idempotencyKey: "chat-key-101" });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: 20, role: "customer", idempotencyKey: "chat-key-101" }));
    expect(notify).toHaveBeenCalledWith(10, "Nova mensagem no pedido", "Há uma nova mensagem no pedido #101.", { type: "order", orderId: 101 });
    expect(result).toEqual({ messageId: 301, duplicate: false });
  });

  it("returns the existing message on a retry with the same key", async () => {
    prepareParticipant(customer);
    vi.spyOn(db, "getChatMessageByIdempotencyKey").mockResolvedValue(message);
    const create = vi.spyOn(db, "createChatMessage").mockResolvedValue({ id: 999, duplicate: false });

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.chat.send({ orderId: 101, body: "duplicada", idempotencyKey: "chat-key-101" });

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ messageId: 301, duplicate: true });
  });

  it("allows the store owner to read and answer the order chat as merchant", async () => {
    prepareParticipant(merchant);
    vi.spyOn(db, "listChatMessages").mockResolvedValue([message] as any);
    vi.spyOn(db, "getChatMessageByIdempotencyKey").mockResolvedValue(undefined);
    vi.spyOn(db, "createChatMessage").mockResolvedValue({ id: 302, duplicate: false });
    const notify = vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 0 });
    const markRead = vi.spyOn(db, "markChatMessagesRead").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const list = await caller.pediu.experience.chat.list({ orderId: 101 });
    const sent = await caller.pediu.experience.chat.send({ orderId: 101, body: "Saiu para entrega", idempotencyKey: "chat-key-302" });
    await caller.pediu.experience.chat.markRead({ orderId: 101 });

    expect(list).toHaveLength(1);
    expect(sent.messageId).toBe(302);
    expect(notify).toHaveBeenCalledWith(20, "Nova mensagem no pedido", "Há uma nova mensagem no pedido #101.", { type: "order", orderId: 101 });
    expect(markRead).toHaveBeenCalledWith(101, 10);
  });

  it("updates only the authenticated user's notification preferences", async () => {
    const preferences = { id: 1, userId: 20, orderUpdates: 1, supportMessages: 1, promotions: 1, pushEnabled: 1, updatedAt: new Date() } as any;
    const read = vi.spyOn(db, "getNotificationPreferences").mockResolvedValue(preferences);
    const update = vi.spyOn(db, "updateNotificationPreferences").mockResolvedValue({ ...preferences, promotions: 0 });

    const caller = appRouter.createCaller({ user: customer } as any);
    await caller.pediu.notifications.preferences.mine();
    const result = await caller.pediu.notifications.preferences.update({ promotions: false });

    expect(read).toHaveBeenCalledWith(20);
    expect(update).toHaveBeenCalledWith(20, { promotions: 0 });
    expect(result.promotions).toBe(0);
  });
});
