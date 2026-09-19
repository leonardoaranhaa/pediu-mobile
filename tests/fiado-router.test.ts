import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const merchant = {
  id: 10,
  openId: "merchant-10",
  name: "Loja Teste",
  email: "loja@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const store = {
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
};

describe("Pediu Fiado contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merchant creates a customer through its own store", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as any);
    const createCustomer = vi.spyOn(db, "createCustomer").mockResolvedValue(301);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.clients.create({
      name: "Cliente Teste",
      creditLimit: "200.00",
    });

    expect(result).toBe(301);
    expect(createCustomer).toHaveBeenCalledWith({
      name: "Cliente Teste",
      creditLimit: "200.00",
      storeId: 7,
    });
  });

  it("merchant can set a credit limit and block a customer only in its own store", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as any);
    const setLimit = vi.spyOn(db, "setCustomerCreditLimit").mockResolvedValue(undefined as any);
    const block = vi.spyOn(db, "blockCustomer").mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller({ user: merchant } as any);

    await caller.pediu.credit.setLimit({ customerId: 301, creditLimit: "300.00" });
    await caller.pediu.credit.block({ customerId: 301, blocked: true });

    expect(setLimit).toHaveBeenCalledWith(7, 301, "300.00");
    expect(block).toHaveBeenCalledWith(7, 301, true);
  });

  it("returns credit balance and available limit from persisted customer data", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as any);
    vi.spyOn(db, "getCustomerCredit").mockResolvedValue({
      id: 301,
      storeId: 7,
      userId: 20,
      creditLimit: "300.00",
      balance: "125.50",
      status: "active",
    } as any);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.credit.get({ customerId: 301 });

    expect(result).toMatchObject({
      customerId: 301,
      creditLimit: "300.00",
      balance: "125.50",
      available: 174.5,
      status: "active",
    });
  });

  it("records a debt payment through the merchant ledger contract", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as any);
    const addLedger = vi.spyOn(db, "createLedgerEntry").mockResolvedValue(401);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.ledger.add({
      customerId: 301,
      type: "payment",
      amount: "50.00",
      note: "Pagamento de dívida",
    });

    expect(result).toBe(401);
    expect(addLedger).toHaveBeenCalledWith({
      customerId: 301,
      type: "payment",
      amount: "50.00",
      note: "Pagamento de dívida",
      storeId: 7,
    });
  });

  it("fiado purchase uses server-side product price and persisted credit account", async () => {
    const customer = {
      id: 301,
      storeId: 7,
      userId: 20,
      name: "Cliente Teste",
      phone: null,
      notes: null,
      creditLimit: "300.00",
      balance: "20.00",
      status: "active",
    };

    vi.spyOn(db, "getStoreById").mockResolvedValue(store as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Produto Teste",
      category: "Lanches",
      price: "30.00",
      available: 1,
    } as any);
    vi.spyOn(db, "getCustomerCreditByUser").mockResolvedValue(customer as any);
    const createFiado = vi.spyOn(db, "createOrderWithFiado").mockResolvedValue(501);

    const caller = appRouter.createCaller({
      user: { ...merchant, id: 20, role: "user" },
    } as any);

    const result = await caller.pediu.orders.create({
      storeId: 7,
      total: "30.00",
      paymentMethod: "fiado",
      deliveryAddress: "Rua Teste, 10",
      items: [{ productId: 101, quantity: 1, unitPrice: "999.99" }],
    });

    expect(result).toMatchObject({ orderId: 501, paymentId: null, status: "Pendente" });
    expect(createFiado).toHaveBeenCalledWith(
      {
        customerId: 20,
        storeId: 7,
        total: "30.00",
        deliveryAddress: "Rua Teste, 10",
      },
      [{ productId: 101, quantity: 1, unitPrice: "30.00" }],
      301,
      7,
    );
  });
});
