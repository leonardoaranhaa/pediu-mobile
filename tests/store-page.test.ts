import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import { storeHeaderCopy } from "../lib/store-header";
import { filterHomeStores, groupHomeStores, prepEstimateLabel } from "../lib/home-stores";

describe("store page header", () => {
  it("shows an open store with time, fee and minimum", () => {
    expect(
      storeHeaderCopy({
        open: true,
        deliveryFee: "5.00",
        prepMinutes: 30,
        minOrder: "20.00",
      }),
    ).toEqual({
      badge: "Aberta",
      closed: false,
      timeLabel: "Cerca de 30 min",
      feeLabel: "Entrega R$ 5,00",
      minOrderLabel: "Pedido mínimo R$ 20,00",
      closedNote: null,
    });
  });

  it("greys a closed store and keeps the next opening", () => {
    expect(
      storeHeaderCopy({
        open: false,
        nextOpenLabel: "Abre amanhã às 11:00",
        deliveryFee: "0",
        prepMinutes: 20,
        minOrder: "0",
      }),
    ).toMatchObject({
      badge: "Fechada agora",
      closed: true,
      feeLabel: "Entrega grátis",
      minOrderLabel: null,
      closedNote: "Abre amanhã às 11:00",
    });
  });
});

describe("home store cards", () => {
  it("keeps one card per store and marks a closed store", () => {
    const cards = groupHomeStores([
      { id: 1, storeId: 3, store: "Cê decide", name: "Lasanha", deliveryFee: "4.00", storeOpen: false, nextOpenLabel: "Abre amanhã às 11:00" },
      { id: 2, storeId: 3, store: "Cê decide", name: "Suco", deliveryFee: "4.00", storeOpen: false },
      { id: 3, storeId: 4, store: "Mercado", name: "Arroz", deliveryFee: "0", storeOpen: true },
    ]);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ name: "Cê decide", open: false, nextOpenLabel: "Abre amanhã às 11:00" });
    expect(cards[1]).toMatchObject({ name: "Mercado", open: true });
    expect(filterHomeStores(cards, "abertas").map((store) => store.name)).toEqual(["Mercado"]);
    expect(filterHomeStores(cards, "gratis").map((store) => store.name)).toEqual(["Mercado"]);
  });

  it("turns prep minutes into a range and hides a missing time", () => {
    expect(prepEstimateLabel(25)).toBe("25–35 min");
    expect(prepEstimateLabel(null)).toBeNull();
    expect(prepEstimateLabel(0)).toBeNull();
  });
});

describe("public store menu", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the store header and its products from data that already exists", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 3,
      ownerId: 9,
      name: "Cê decide",
      isOpen: 0,
      openingHours: null,
      deliveryFee: "4.00",
      minOrder: "15.00",
      prepMinutes: 25,
      logoData: null,
    } as never);
    vi.spyOn(db, "getStoreOps").mockResolvedValue({
      approvalStatus: "approved",
      cardCreditEnabled: false,
      cardDebitEnabled: false,
      pausedUntil: null,
      pauseManual: false,
      feeMode: "fixed",
      feePerKm: "0.00",
    });
    vi.spyOn(db, "storeListedForCustomers").mockResolvedValue(true);
    vi.spyOn(db, "listProductsForStore").mockResolvedValue([
      {
        id: 8,
        name: "Lasanha",
        description: "Molho da casa",
        price: "32.00",
        imageData: null,
        available: 1,
        category: "Massas",
      },
    ] as never);

    const result = await appRouter.createCaller({ user: null } as never).pediu.marketplace.store({
      storeId: 3,
    });

    expect(result).toMatchObject({
      name: "Cê decide",
      open: false,
      deliveryFee: "4.00",
      minOrder: "15.00",
      prepMinutes: 25,
      products: [{ name: "Lasanha", price: "32.00" }],
    });
  });
});
