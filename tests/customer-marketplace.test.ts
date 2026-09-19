import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu customer marketplace contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the persisted catalog with real store context", async () => {
    vi.spyOn(db, "listAvailableProducts").mockResolvedValue([
      {
        id: 101,
        storeId: 7,
        name: "Produto Teste",
        category: "Doces",
        description: null,
        price: "18.00",
        available: 1,
        createdAt: new Date(),
        storeName: "Loja Teste",
        deliveryFee: "5.00",
      },
    ] as any);

    const caller = appRouter.createCaller({ user: customer } as any);
    const products = await caller.pediu.marketplace.products({ category: "Doces" });

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      storeId: 7,
      storeName: "Loja Teste",
      deliveryFee: "5.00",
    });
  });

  it("recalculates the order total from persisted product prices", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
      phone: null,
      address: null,
      pixKey: null,
      deliveryFee: "5.00",
      isOpen: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Produto Teste",
      category: "Doces",
      description: null,
      price: "18.00",
      available: 1,
      createdAt: new Date(),
    } as any);
    const createOrder = vi.spyOn(db, "createOrder").mockResolvedValue(501);
    const createPayment = vi.spyOn(db, "createOrderPayment").mockResolvedValue(601);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.orders.create({
      storeId: 7,
      total: "23.00",
      paymentMethod: "pix",
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(result).toMatchObject({ orderId: 501, paymentId: 601, status: "Pendente" });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 20, storeId: 7, total: "23.00" }),
      [{ productId: 101, quantity: 1, unitPrice: "18.00" }],
    );
    expect(createPayment).toHaveBeenCalledWith(501, "pix");
  });


  it.each(["card", "cash"] as const)("creates a pending payment for %s checkout", async (paymentMethod) => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
      deliveryFee: "0.00",
      isOpen: true,
    } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Produto Teste",
      category: "Lanches",
      price: "20.00",
      available: 1,
    } as any);
    vi.spyOn(db, "createOrder").mockResolvedValue(502);
    const createPayment = vi.spyOn(db, "createOrderPayment").mockResolvedValue(602);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.orders.create({
      storeId: 7,
      total: "20.00",
      paymentMethod,
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(result).toMatchObject({ orderId: 502, paymentId: 602, status: "Pendente" });
    expect(createPayment).toHaveBeenCalledWith(502, paymentMethod);
  });

  it("rejects a client-supplied total that does not match the catalog", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
      deliveryFee: "5.00",
      isOpen: true,
    } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      price: "18.00",
      available: 1,
    } as any);

    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(
      caller.pediu.orders.create({
        storeId: 7,
        total: "999.00",
        paymentMethod: "pix",
        deliveryAddress: "Rua Teste, 10",
        items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
      }),
    ).rejects.toThrow("Total do pedido inválido");
  });
});
