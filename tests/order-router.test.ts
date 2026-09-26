import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as push from "../server/push";
const user = {
  id: 10,
  openId: "merchant-10",
  name: "Loja Teste",
  email: "loja@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const order = {
  id: 101,
  customerId: 20,
  storeId: 7,
  total: "35.00",
  status: "Pendente" as const,
  deliveryAddress: "Rua Teste, 10",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Pediu order operational contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merchant sees its order and advances it through the real router contract", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
      phone: null,
      address: null,
      pixKey: null,
      deliveryFee: "0.00",
      isOpen: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(db, "listOrdersForStore").mockResolvedValue([order] as any);
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);
    vi.spyOn(db, "updateOrderStatus").mockResolvedValue({
      changed: true,
      status: "Aceito",
    });
    const event = vi.spyOn(db, "createDeliveryEvent").mockResolvedValue(1);
    const notify = vi
      .spyOn(push, "sendPushToUser")
      .mockResolvedValue({ sent: 0 });

    const caller = appRouter.createCaller({ user } as any);
    const visible = await caller.pediu.orders.storeMine();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(101);

    await caller.pediu.orders.status({ orderId: 101, status: "Aceito" });

    expect(db.updateOrderStatus).toHaveBeenCalledWith(
      101,
      "Aceito",
      "Pendente",
    );
    expect(event).toHaveBeenCalledWith({ orderId: 101, eventType: "Aceito" });
    expect(notify).toHaveBeenCalledWith(
      20,
      "Atualização do pedido",
      "Seu pedido #101 agora está: Aceito.",
      { type: "order", orderId: 101, status: "Aceito" },
    );
  });

  it("blocks an invalid jump through the router", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
    } as any);

    const caller = appRouter.createCaller({ user } as any);

    await expect(
      caller.pediu.orders.status({ orderId: 101, status: "Pronto" }),
    ).rejects.toThrow("Transição de pedido inválida");
  });

  it("collapses two concurrent identical status changes into one event", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
    } as any);
    const update = vi
      .spyOn(db, "updateOrderStatus")
      .mockResolvedValueOnce({ changed: true, status: "Aceito" })
      .mockResolvedValueOnce({ changed: false, status: "Aceito" });
    const event = vi.spyOn(db, "createDeliveryEvent").mockResolvedValue(1);
    vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 0 });

    const caller = appRouter.createCaller({ user } as any);
    const results = await Promise.all([
      caller.pediu.orders.status({ orderId: 101, status: "Aceito" }),
      caller.pediu.orders.status({ orderId: 101, status: "Aceito" }),
    ]);

    expect(results).toEqual([{ success: true }, { success: true }]);
    expect(update).toHaveBeenCalledTimes(2);
    expect(event).toHaveBeenCalledTimes(1);
  });

  it("accepts a retry that reads the already-applied status", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue({
      ...order,
      status: "Aceito",
    } as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
    } as any);
    const update = vi.spyOn(db, "updateOrderStatus");
    const event = vi.spyOn(db, "createDeliveryEvent");

    const caller = appRouter.createCaller({ user } as any);
    await expect(
      caller.pediu.orders.status({ orderId: 101, status: "Aceito" }),
    ).resolves.toEqual({ success: true });
    expect(update).not.toHaveBeenCalled();
    expect(event).not.toHaveBeenCalled();
  });

  it("rejects a stale transition when another status already won the race", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
    } as any);
    vi.spyOn(db, "updateOrderStatus").mockResolvedValue({
      changed: false,
      status: "Aceito",
    });
    const event = vi.spyOn(db, "createDeliveryEvent");

    const caller = appRouter.createCaller({ user } as any);
    await expect(
      caller.pediu.orders.status({ orderId: 101, status: "Cancelado" }),
    ).rejects.toThrow("O pedido mudou durante a atualização");
    expect(event).not.toHaveBeenCalled();
  });

  it("customer cancellation also cancels any pending payment", async () => {
    const customer = {
      ...user,
      id: 20,
      openId: "customer-20",
      role: "user" as const,
    };
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(undefined as any);
    vi.spyOn(db, "updateOrderStatus").mockResolvedValue({
      changed: true,
      status: "Cancelado",
    });
    const cancelPayment = vi
      .spyOn(db, "cancelPendingPaymentForOrder")
      .mockResolvedValue(undefined as any);
    vi.spyOn(db, "getStoreById").mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller({ user: customer } as any);
    await caller.pediu.orders.status({ orderId: 101, status: "Cancelado" });

    expect(db.updateOrderStatus).toHaveBeenCalledWith(
      101,
      "Cancelado",
      "Pendente",
    );
    expect(cancelPayment).toHaveBeenCalledWith(101);
  });

  it("returns the customer's own order through the protected detail query", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.orders.get({ orderId: 101 });

    expect(result.id).toBe(101);
    expect(result.customerId).toBe(20);
  });
});
