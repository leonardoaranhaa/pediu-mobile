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

  it("quotes current prices and delivery fee from the server", async () => {
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
      name: "Produto Teste",
      price: "18.00",
      available: 1,
    } as any);

    const caller = appRouter.createCaller({ user: customer } as any);
    const quote = await caller.pediu.checkout.quote({ storeId: 7, items: [{ productId: 101, quantity: 2 }] });

    expect(quote).toMatchObject({ storeId: 7, subtotal: "36.00", deliveryFee: "5.00", total: "41.00" });
    expect(quote.items[0]).toMatchObject({ productId: 101, quantity: 2, unitPrice: "18.00", lineTotal: "36.00" });
  });

  it("rejects a quote when a product is unavailable", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({ id: 7, ownerId: 10, name: "Loja Teste", deliveryFee: "0.00", isOpen: true } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(caller.pediu.checkout.quote({ storeId: 7, items: [{ productId: 101, quantity: 1 }] })).rejects.toThrow("produto inválido ou indisponível");
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
    const createOrderWithPayment = vi.spyOn(db, "createOrderWithPayment").mockResolvedValue({ orderId: 501, paymentId: 601 });

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.orders.create({
      idempotencyKey: "test-order-501",
      storeId: 7,
      total: "23.00",
      paymentMethod: "pix",
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(result).toMatchObject({ orderId: 501, paymentId: 601, status: "Pendente" });
    expect(createOrderWithPayment).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 20, storeId: 7, total: "23.00" }),
      [{ productId: 101, quantity: 1, unitPrice: "18.00" }],
      "pix",
    );
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
    const createOrderWithPayment = vi.spyOn(db, "createOrderWithPayment").mockResolvedValue({ orderId: 502, paymentId: 602 });

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.orders.create({
      idempotencyKey: `test-order-${paymentMethod}`,
      storeId: 7,
      total: "20.00",
      paymentMethod,
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(result).toMatchObject({ orderId: 502, paymentId: 602, status: "Pendente" });
    expect(createOrderWithPayment).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 20, storeId: 7, total: "20.00" }),
      [{ productId: 101, quantity: 1, unitPrice: "20.00" }],
      paymentMethod,
    );
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
        idempotencyKey: "test-order-invalid-total",
        storeId: 7,
        total: "999.00",
        paymentMethod: "pix",
        deliveryAddress: "Rua Teste, 10",
        items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
      }),
    ).rejects.toThrow("Total do pedido inválido");
  });

  it("returns the persisted order on an idempotent retry", async () => {
    vi.spyOn(db, "getOrderByIdempotencyKey").mockResolvedValue({ id: 501, customerId: 20, status: "Pendente" } as any);
    vi.spyOn(db, "getPaymentForOrder").mockResolvedValue({ id: 601 } as any);
    const createOrderWithPayment = vi.spyOn(db, "createOrderWithPayment");
    const caller = appRouter.createCaller({ user: customer } as any);

    const result = await caller.pediu.orders.create({
      idempotencyKey: "test-order-retry",
      storeId: 7,
      total: "23.00",
      paymentMethod: "pix",
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "18.00" }],
    });

    expect(result).toMatchObject({ orderId: 501, paymentId: 601, status: "Pendente" });
    expect(createOrderWithPayment).not.toHaveBeenCalled();
  });
});
