import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import { priceSelectedOptions } from "../server/domain/order-options";
import { availableInventoryQuantity } from "../server/domain/inventory";
import {
  classifyPendingOrder,
  orderVisibleToStore,
  PIX_TTL_MS,
} from "../server/pix-lifecycle";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

const address = {
  id: 900,
  latitude: "-23.550520",
  longitude: "-46.633308",
  street: "Rua Teste",
  number: "10",
  complement: null,
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  postalCode: "01311000",
};

describe("essential market and fast-food order rules", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prices a required fast-food size and refuses the item without it", () => {
    const groups = [
      {
        id: 1,
        name: "Tamanho",
        required: 1,
        choices: [
          { id: 11, name: "Broto", priceDelta: "0.00" },
          { id: 12, name: "Grande", priceDelta: "10.00" },
        ],
      },
    ];
    expect(priceSelectedOptions("25.00", groups, [12])).toMatchObject({
      ok: true,
      unitPrice: "35.00",
      label: "Tamanho: Grande",
    });
    expect(priceSelectedOptions("25.00", groups, []).ok).toBe(false);
  });

  it("keeps a tracked market quantity from selling more than the shelf", () => {
    expect(availableInventoryQuantity(4, 1)).toBe(3);
    expect(availableInventoryQuantity(4, 1) >= 4).toBe(false);
    expect(availableInventoryQuantity(4, 0) >= 2).toBe(true);
  });

  it("hides an unpaid PIX from the store and does not treat it as an accept timeout", () => {
    const createdAt = new Date("2026-11-06T12:00:00.000Z");
    expect(orderVisibleToStore({ method: "pix", status: "pending" })).toBe(false);
    expect(orderVisibleToStore({ method: "pix", status: "paid" })).toBe(true);
    expect(orderVisibleToStore({ method: "cash", status: "paid" })).toBe(true);
    expect(orderVisibleToStore(null)).toBe(true);
    expect(
      classifyPendingOrder({
        createdAt,
        updatedAt: createdAt,
        paymentMethod: "pix",
        paymentStatus: "pending",
        now: new Date(createdAt.getTime() + 5 * 60_000),
        acceptTtlMs: 5 * 60_000,
        pixTtlMs: PIX_TTL_MS,
      }),
    ).toBe("keep");
    expect(
      classifyPendingOrder({
        createdAt,
        updatedAt: createdAt,
        paymentMethod: "pix",
        paymentStatus: "pending",
        now: new Date(createdAt.getTime() + PIX_TTL_MS),
        acceptTtlMs: 5 * 60_000,
        pixTtlMs: PIX_TTL_MS,
      }),
    ).toBe("pix_expired");
  });

  it("refuses market pickup and prices a fast-food option on the server", async () => {
    vi.spyOn(db, "getCustomerAddress").mockResolvedValue(address as never);
    vi.spyOn(db, "getOrderByIdempotencyKey").mockResolvedValue(undefined);
    vi.spyOn(db, "getStoreById").mockImplementation(async (storeId: number) => {
      if (storeId === 8) {
        return {
          id: 8,
          ownerId: 30,
          name: "Mercado Teste",
          kind: "market",
          isOpen: 1,
          deliveryEnabled: 1,
          pickupEnabled: 0,
          deliveryRadiusKm: "5.00",
          deliveryFee: "6.00",
          latitude: "-23.550520",
          longitude: "-46.633308",
          flashEnabled: 0,
        } as never;
      }
      return {
        id: 7,
        ownerId: 30,
        name: "Lanches Teste",
        kind: "restaurant",
        isOpen: 1,
        deliveryEnabled: 1,
        pickupEnabled: 0,
        deliveryRadiusKm: "5.00",
        deliveryFee: "5.00",
        latitude: "-23.550520",
        longitude: "-46.633308",
        flashEnabled: 0,
      } as never;
    });
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Pizza",
      price: "25.00",
      available: 1,
      inventoryTracked: 0,
      stockQuantity: 0,
      reservedQuantity: 0,
    } as never);
    vi.spyOn(db, "listProductOptions").mockResolvedValue([
      {
        id: 1,
        name: "Tamanho",
        required: 1,
        choices: [
          { id: 11, name: "Broto", priceDelta: "0.00" },
          { id: 12, name: "Grande", priceDelta: "10.00" },
        ],
      },
    ] as never);
    const createOrder = vi
      .spyOn(db, "createOrderWithPayment")
      .mockResolvedValue({ orderId: 501, paymentId: 1 });
    const caller = appRouter.createCaller({ user: customer } as never);

    await expect(
      caller.pediu.orders.create({
        idempotencyKey: "market-pickup-1",
        storeId: 8,
        total: "10.00",
        paymentMethod: "cash",
        fulfillmentMode: "pickup",
        items: [{ productId: 201, quantity: 1, unitPrice: "10.00" }],
      }),
    ).rejects.toThrow(/mercado são entregues/i);

    await caller.pediu.orders.create({
      idempotencyKey: "pizza-grande-1",
      storeId: 7,
      addressId: 900,
      total: "40.00",
      paymentMethod: "cash",
      fulfillmentMode: "delivery",
      items: [{ productId: 101, quantity: 1, unitPrice: "1.00", optionIds: [12] }],
    });

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 20,
        storeId: 7,
        total: "40.00",
      }),
      [expect.objectContaining({ productId: 101, quantity: 1, unitPrice: "35.00" })],
      "cash",
    );
  });
});
