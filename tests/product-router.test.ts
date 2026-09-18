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

describe("Pediu merchant catalog contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows a merchant to list only its own catalog", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
    } as any);
    vi.spyOn(db, "listProductsForStore").mockResolvedValue([
      {
        id: 101,
        storeId: 7,
        name: "Produto Teste",
        category: "Doces",
        description: null,
        price: "18.00",
        available: 1,
        createdAt: new Date(),
      },
    ] as any);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const products = await caller.pediu.products.mine({ storeId: 7 });

    expect(products).toHaveLength(1);
    expect(products[0].storeId).toBe(7);
  });

  it("rejects product availability changes for another store", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Teste",
    } as any);
    vi.spyOn(db, "getProductForStore").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: merchant } as any);

    await expect(
      caller.pediu.products.availability({ productId: 999, available: false }),
    ).rejects.toThrow("Produto não pertence à sua loja");
  });
});
