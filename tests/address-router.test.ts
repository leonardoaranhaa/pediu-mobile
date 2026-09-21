import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = {
  id: 10,
  openId: "customer-10",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

const address = {
  id: 7,
  userId: 10,
  label: "Casa",
  recipientName: "Cliente Teste",
  street: "Rua das Flores",
  number: "100",
  complement: null,
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  postalCode: "01001000",
  latitude: null,
  longitude: null,
  isDefault: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const addressInput = {
  label: "Casa",
  recipientName: "Cliente Teste",
  street: "Rua das Flores",
  number: "100",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "sp",
  postalCode: "01001000",
  isDefault: true,
};

describe("Pediu customer address contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists addresses for the authenticated customer", async () => {
    const list = vi.spyOn(db, "listCustomerAddresses").mockResolvedValue([address] as any);
    const caller = appRouter.createCaller({ user: customer } as any);

    const result = await caller.pediu.addresses.list();

    expect(result).toEqual([address]);
    expect(list).toHaveBeenCalledWith(customer.id);
  });

  it("normalizes and forwards a new address to the authenticated user", async () => {
    const create = vi.spyOn(db, "createCustomerAddress").mockResolvedValue(address.id);
    const caller = appRouter.createCaller({ user: customer } as any);

    const result = await caller.pediu.addresses.create(addressInput);

    expect(result).toBe(address.id);
    expect(create).toHaveBeenCalledWith(customer.id, expect.objectContaining({
      state: "SP",
      isDefault: true,
    }));
  });

  it("rejects address reads without an authenticated session", async () => {
    const caller = appRouter.createCaller({ user: null } as any);

    await expect(caller.pediu.addresses.list()).rejects.toThrow(/Please login|autentic/i);
  });

  it("passes the address id to the authenticated mutation", async () => {
    const setDefault = vi.spyOn(db, "setDefaultCustomerAddress").mockResolvedValue();
    const caller = appRouter.createCaller({ user: customer } as any);

    await caller.pediu.addresses.setDefault({ addressId: address.id });

    expect(setDefault).toHaveBeenCalledWith(customer.id, address.id);
  });
});
