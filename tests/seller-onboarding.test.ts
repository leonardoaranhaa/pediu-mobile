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

  it("updates only the authenticated owner's store settings", async () => {
    const updated = vi.spyOn(db, "updateStoreForOwner").mockResolvedValue({
      id: 77,
      ownerId: 42,
      name: "Mercado Atualizado",
      phone: "11988887777",
      address: "Rua Nova, 77",
      pixKey: "pix-novo@example.com",
      deliveryFee: "7.50",
      isOpen: 0,
      createdAt: new Date(),
    });
    const caller = appRouter.createCaller({ user: { ...customer, role: "merchant" } } as any);

    const store = await caller.pediu.stores.update({
      name: "Mercado Atualizado",
      phone: "11988887777",
      address: "Rua Nova, 77",
      pixKey: "pix-novo@example.com",
      deliveryFee: "7.50",
      isOpen: false,
    });

    expect(store.id).toBe(77);
    expect(updated).toHaveBeenCalledWith(42, {
      name: "Mercado Atualizado",
      phone: "11988887777",
      address: "Rua Nova, 77",
      pixKey: "pix-novo@example.com",
      deliveryFee: "7.50",
      isOpen: 0,
    });
  });
});
