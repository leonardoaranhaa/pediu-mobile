import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import {
  calculateEarnPoints,
  planLoyaltyRedeem,
  resolveLoyaltyTier,
} from "../server/domain/loyalty";
import {
  clampTipAmount,
  resolveFlashFulfillment,
} from "../server/domain/flash";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu loyalty + flash domain", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolves tiers and earn multipliers", () => {
    expect(resolveLoyaltyTier(0)).toBe("bronze");
    expect(resolveLoyaltyTier(500)).toBe("prata");
    expect(resolveLoyaltyTier(1500)).toBe("flash99");
    expect(calculateEarnPoints(100, "bronze")).toBe(100);
    expect(calculateEarnPoints(100, "prata")).toBe(120);
    expect(planLoyaltyRedeem(250, 2)).toMatchObject({
      ok: true,
      pointsSpent: 200,
      creditAmount: "10.00",
    });
    expect(planLoyaltyRedeem(50, 1).ok).toBe(false);
  });

  it("validates flash fulfillment and tip clamp on the server", () => {
    expect(
      resolveFlashFulfillment(
        {
          isOpen: 1,
          flashEnabled: 1,
          deliveryFee: "5.00",
          flashFeeOverride: "0.00",
        },
        "flash",
      ),
    ).toMatchObject({
      isFlash: true,
      deliveryFee: "0.00",
    });
    expect(
      resolveFlashFulfillment(
        { isOpen: 1, flashEnabled: 0, deliveryFee: "5.00" },
        "flash",
      ).isFlash,
    ).toBe(false);
    expect(clampTipAmount(4, 40)).toBe("4.00");
    expect(() => clampTipAmount(60, 40)).toThrow("Gorjeta acima do limite");
  });

  it("exposes loyalty me/history/redeem contracts", async () => {
    vi.spyOn(db, "getLoyaltySummary").mockResolvedValue({
      points: 120,
      lifetimePoints: 520,
      tier: "prata",
      tierLabel: "Prata",
      progress: 0.02,
      nextTier: "flash99",
      nextTierLabel: "Flash 99",
      pointsToNextTier: 980,
      redeemBlockPoints: 100,
      redeemCreditBrl: "5.00",
    } as any);
    vi.spyOn(db, "listLoyaltyHistory").mockResolvedValue([
      { id: 1, points: 20, direction: "credit", reason: "order_delivered" },
    ] as any);
    vi.spyOn(db, "redeemLoyaltyPoints").mockResolvedValue({
      duplicate: false,
      pointsSpent: 100,
      creditAmount: "5.00",
      couponCode: "CLUBE20ABC",
      balance: 20,
    });

    const caller = appRouter.createCaller({ user: customer } as any);
    await expect(caller.pediu.loyalty.me()).resolves.toMatchObject({
      tier: "prata",
      points: 120,
    });
    await expect(
      caller.pediu.loyalty.history({ limit: 10, offset: 0 }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.pediu.loyalty.redeem({
        blocks: 1,
        idempotencyKey: "redeem-test-001",
      }),
    ).resolves.toMatchObject({
      couponCode: "CLUBE20ABC",
      creditAmount: "5.00",
    });
  });

  it("filters marketplace by flash and market vertical", async () => {
    const search = vi.spyOn(db, "searchAvailableProducts").mockResolvedValue({
      items: [
        {
          id: 1,
          name: "Banana",
          storeKind: "market",
          flashEnabled: 1,
          flashEtaMaxMinutes: 25,
          storeName: "Mercado",
          deliveryFee: "2.00",
          price: "3.00",
          available: 1,
          storeId: 9,
          category: "Hortifruti",
          description: null,
          createdAt: new Date(),
        },
      ],
      hasMore: false,
    } as any);

    const caller = appRouter.createCaller({ user: customer } as any);
    await caller.pediu.marketplace.search({
      flash: true,
      vertical: "market",
      limit: 10,
      offset: 0,
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ flash: true, vertical: "market" }),
    );
  });

  it("resolves taste moods through marketplace.taste", async () => {
    vi.spyOn(db, "searchAvailableProducts").mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
    });
    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.marketplace.taste({
      moodId: "party",
      limit: 10,
      offset: 0,
    });
    expect(result.mood.title).toBe("Festa");
    expect(db.searchAvailableProducts).toHaveBeenCalledWith(
      expect.objectContaining({ query: "pizza" }),
    );
  });

  it("quotes flash + tip without trusting client pricing", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja Flash",
      deliveryFee: "5.00",
      flashFeeOverride: "1.00",
      flashEnabled: 1,
      isOpen: 1,
      kind: "restaurant",
      flashEtaMaxMinutes: 20,
      deliveryEnabled: 1,
      deliveryRadiusKm: "10.00",
      latitude: "-23.5505",
      longitude: "-46.6333",
    } as any);
    vi.spyOn(db, "getCustomerAddress").mockResolvedValue({
      id: 12,
      userId: customer.id,
      label: "Casa",
      street: "Rua Teste",
      number: "10",
      complement: null,
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      postalCode: "01000000",
      latitude: "-23.5510",
      longitude: "-46.6333",
      isDefault: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue({
      id: 101,
      storeId: 7,
      name: "Produto",
      price: "10.00",
      available: 1,
    } as any);

    const quote = await appRouter
      .createCaller({ user: customer } as any)
      .pediu.checkout.quote({
        storeId: 7,
        addressId: 12,
        items: [{ productId: 101, quantity: 2 }],
        fulfillment: "flash",
        tipAmount: 3,
      });

    expect(quote).toMatchObject({
      subtotal: "20.00",
      deliveryFee: "1.00",
      tipAmount: "3.00",
      isFlash: true,
      flashEligible: true,
      fulfillment: "flash",
      total: "24.00",
    });
  });

  it("rejects flash quote when store flag is off", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      deliveryFee: "5.00",
      flashEnabled: 0,
      isOpen: 1,
    } as any);

    await expect(
      appRouter.createCaller({ user: customer } as any).pediu.checkout.quote({
        storeId: 7,
        items: [{ productId: 101, quantity: 1 }],
        fulfillment: "flash",
      }),
    ).rejects.toThrow("não oferece Pediu Flash");
  });
});
