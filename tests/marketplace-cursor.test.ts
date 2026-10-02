import { describe, expect, it } from "vitest";

import {
  decodeMarketplaceCursor,
  encodeMarketplaceCursor,
  marketplaceFilterKey,
} from "../server/domain/marketplace-cursor";

describe("marketplace cursor", () => {
  const filterKey = marketplaceFilterKey({
    category: "Doces",
    maxPrice: 30,
    minPrice: 5,
    query: " Brownie ",
  });

  it("round-trips an opaque keyset cursor", () => {
    const cursor = encodeMarketplaceCursor({
      filterKey,
      adId: 42,
      createdAt: new Date("2026-10-02T12:00:00.000Z"),
      productId: 101,
    });

    expect(cursor).toMatch(/^pc1_/);
    expect(cursor).not.toContain("Brownie");
    expect(decodeMarketplaceCursor(cursor)).toEqual({
      version: 1,
      filterKey,
      adId: 42,
      createdAt: "2026-10-02T12:00:00.000Z",
      productId: 101,
    });
  });

  it("supports the null-ad tail of the ordering", () => {
    const cursor = encodeMarketplaceCursor({
      filterKey,
      adId: null,
      createdAt: new Date("2026-10-02T12:00:00.000Z"),
      productId: 101,
    });

    expect(decodeMarketplaceCursor(cursor).adId).toBeNull();
  });

  it.each(["", "pc2_bad", "pc1_not-json", "pc1_eyJ2ZXJzaW9uIjoyfQ"])(
    "rejects malformed cursor %s",
    (cursor) => {
      expect(() => decodeMarketplaceCursor(cursor)).toThrow(
        "Cursor de marketplace inválido",
      );
    },
  );
});
