import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as push from "../server/push";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu order/payment consistency", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists the order and its payment through one transactional database operation", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 30,
      name: "Loja Teste",
      isOpen: 1,
      deliveryFee: "5.00",
      pixKey: "pix@test.local",
    } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Produto",
      category: "Lanches",
      price: "30.00",
      available: 1,
    } as any);

    const atomicCreate = vi.spyOn(db, "createOrderWithPayment").mockResolvedValue({
      orderId: 501,
      paymentId: 701,
    });
    const legacyOrder = vi.spyOn(db, "createOrder");
    const legacyPayment = vi.spyOn(db, "createOrderPayment");
    vi.spyOn(push, "sendPushToUser").mockRejectedValue(new Error("push unavailable"));

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.orders.create({
      storeId: 7,
      total: "35.00",
      paymentMethod: "pix",
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(atomicCreate).toHaveBeenCalledWith(
      {
        customerId: 20,
        storeId: 7,
        total: "35.00",
        deliveryAddress: "Rua Teste, 10",
      },
      [{ productId: 101, quantity: 1, unitPrice: "30.00" }],
      "pix",
    );
    expect(legacyOrder).not.toHaveBeenCalled();
    expect(legacyPayment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ orderId: 501, paymentId: 701, status: "Pendente" });
  });
});
