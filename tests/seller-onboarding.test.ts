import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = {
  id: 42,
  openId: "customer-42",
  name: "Cliente Teste",
  email: "cliente@example.com",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu seller onboarding", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows an authenticated regular account to create its first store", async () => {
    const createStore = vi.spyOn(db, "createStore").mockResolvedValue(77);
    const caller = appRouter.createCaller({ user: customer } as any);

    const storeId = await caller.pediu.stores.create({
      name: "Mercado do Bairro",
      phone: "11999999999",
      address: "Rua Teste, 42",
      pixKey: "pix@example.com",
      deliveryFee: "0.00",
    });

    expect(storeId).toBe(77);
    expect(createStore).toHaveBeenCalledWith({
      ownerId: 42,
      name: "Mercado do Bairro",
      phone: "11999999999",
      address: "Rua Teste, 42",
      pixKey: "pix@example.com",
      deliveryFee: "0.00",
    });
  });
});
