import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
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
    vi.spyOn(db, "updateOrderStatus").mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller({ user } as any);
    const visible = await caller.pediu.orders.storeMine();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(101);

    await caller.pediu.orders.status({ orderId: 101, status: "Aceito" });

    expect(db.updateOrderStatus).toHaveBeenCalledWith(101, "Aceito");
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

  it("returns the customer's own order through the protected detail query", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order as any);

    const caller = appRouter.createCaller({ user } as any);
    const result = await caller.pediu.orders.get({ orderId: 101 });

    expect(result.id).toBe(101);
    expect(result.customerId).toBe(20);
  });

});
