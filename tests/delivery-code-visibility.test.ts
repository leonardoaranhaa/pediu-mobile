import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const user = (id: number, role: "user" | "merchant" | "courier") => ({
  id,
  openId: `user-${id}`,
  name: `Pessoa ${id}`,
  email: `p${id}@test.local`,
  loginMethod: "test",
  role,
  lastSignedIn: new Date(),
});
const customer = user(20, "user");
const storeOwner = user(10, "merchant");
const courier = user(30, "courier");
const order = { id: 101, customerId: 20, storeId: 7, status: "A caminho", total: "35.00", deliveryCode: "4821" } as any;

describe("who can read the delivery code", () => {
  afterEach(() => vi.restoreAllMocks());

  function stubOrder() {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(order);
    vi.spyOn(db, "enrichOrdersForStore").mockImplementation(async (rows: any[]) => rows.map((row) => ({ ...row, items: [] })) as any);
  }

  it("shows the code to the customer of the order", async () => {
    stubOrder();
    const result: any = await appRouter.createCaller({ user: customer } as any).pediu.orders.get({ orderId: 101 });
    expect(result.deliveryCode).toBe("4821");
  });

  it("hides the code from the store and from the courier", async () => {
    stubOrder();
    for (const viewer of [storeOwner, courier]) {
      const result: any = await appRouter.createCaller({ user: viewer } as any).pediu.orders.get({ orderId: 101 });
      expect(result).not.toHaveProperty("deliveryCode");
      expect(JSON.stringify(result)).not.toContain("4821");
    }
  });

  it("hides the code in the store's order list", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({ id: 7, ownerId: 10 } as any);
    vi.spyOn(db, "listOrdersForStore").mockResolvedValue([order]);
    vi.spyOn(db, "enrichOrdersForStore").mockImplementation(async (rows: any[]) => rows as any);
    const list: any[] = await appRouter.createCaller({ user: storeOwner } as any).pediu.orders.storeMine({ limit: 10 });
    expect(JSON.stringify(list)).not.toContain("4821");
  });
});
