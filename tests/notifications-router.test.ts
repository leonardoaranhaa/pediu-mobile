import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const user = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu notifications contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists only notifications returned for the authenticated user", async () => {
    vi.spyOn(db, "listNotificationsForUser").mockResolvedValue([
      { id: 1, userId: 20, title: "Pedido", body: "Seu pedido foi aceito.", type: "order", readAt: null, createdAt: new Date() },
    ] as any);

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.notifications.mine();

    expect(db.listNotificationsForUser).toHaveBeenCalledWith(20);
    expect(result[0]).toMatchObject({ userId: 20, type: "order" });
  });

  it("marks a notification as read using the authenticated user id", async () => {
    const markRead = vi.spyOn(db, "markNotificationRead").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user } as any);
    await caller.pediu.notifications.markRead({ notificationId: 1 });

    expect(markRead).toHaveBeenCalledWith(20, 1);
  });

  it("requires authentication for notification access", async () => {
    const caller = appRouter.createCaller({ user: null } as any);

    await expect(caller.pediu.notifications.mine()).rejects.toThrow();
  });
});
