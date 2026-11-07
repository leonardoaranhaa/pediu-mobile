import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import {
  formatCatalogPrice,
  normalizeSaleUnit,
  suggestedSaleUnitForCategory,
  unitSubtitle,
} from "../shared/market-units";
import {
  DEFAULT_TIP_DESTINATION,
  planTipSettlement,
  resolveTipRecipientUserId,
} from "../server/domain/tips";

const merchant = {
  id: 10,
  openId: "merchant-10",
  name: "Mercado Teste",
  email: "mercado@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Mercado units + tip settlement", () => {
  afterEach(() => vi.restoreAllMocks());

  it("formats market catalog prices by unit and pack", () => {
    expect(normalizeSaleUnit("kg")).toBe("kg");
    expect(suggestedSaleUnitForCategory("Hortifruti", "market")).toBe("kg");
    expect(formatCatalogPrice("8.90", "kg", null)).toBe("R$ 8,90 / kg");
    expect(formatCatalogPrice("16.90", "pack", "12")).toBe(
      "R$ 16,90 / cx (12un)",
    );
    expect(formatCatalogPrice("7.50", "kg", "0.5")).toBe("R$ 7,50 / 0.5kg");
    expect(unitSubtitle("pack", "12")).toBe("Caixa com 12 unidades");
  });

  it("plans tip settlement for courier by default", () => {
    expect(DEFAULT_TIP_DESTINATION).toBe("courier");
    expect(planTipSettlement("0.00").ok).toBe(false);
    expect(planTipSettlement(5, "courier")).toMatchObject({
      ok: true,
      amount: "5.00",
      destination: "courier",
    });
    expect(
      resolveTipRecipientUserId({
        destination: "courier",
        courierUserId: 44,
        storeOwnerId: 10,
      }),
    ).toBe(44);
    expect(
      resolveTipRecipientUserId({
        destination: "store",
        courierUserId: 44,
        storeOwnerId: 10,
      }),
    ).toBe(10);
    expect(
      resolveTipRecipientUserId({
        destination: "platform_pool",
        courierUserId: 44,
        storeOwnerId: 10,
      }),
    ).toBeNull();
  });

  it("creates market products with saleUnit and packSize", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Mercado Pediu",
      kind: "market",
    } as any);
    const create = vi.spyOn(db, "createProduct").mockResolvedValue(501);

    const caller = appRouter.createCaller({ user: merchant } as any);
    await caller.pediu.products.create({
      storeId: 7,
      name: "Banana prata",
      category: "Hortifruti",
      price: "8.90",
      saleUnit: "kg",
      packSize: "1",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 7,
        name: "Banana prata",
        saleUnit: "kg",
        packSize: "1",
        available: 1,
      }),
    );
  });

  it("exposes tipDestination on checkout quote", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7,
      ownerId: 10,
      name: "Loja",
      deliveryFee: "5.00",
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
        items: [{ productId: 101, quantity: 1 }],
        tipAmount: 2,
      });

    expect(quote.tipAmount).toBe("2.00");
    expect(quote.tipDestination).toBe("courier");
  });

  it("keeps Pediu Junto off and tip destination courier in flags", async () => {
    const flags = await appRouter
      .createCaller({ user: customer } as any)
      .pediu.experience.flags();
    expect(flags.pediuJunto).toBe(false);
    expect(flags.tipDestination).toBe("courier");
  });
});
