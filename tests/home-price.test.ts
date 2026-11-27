import { describe, expect, it } from "vitest";
import { priceValue } from "../lib/home-stores";

describe("home dish price", () => {
  it("reads the formatted price the home receives", () => {
    expect(priceValue("R$ 45,00")).toBe(45);
    expect(priceValue("R$ 1.250,90")).toBe(1250.9);
  });

  it("reads a raw API price and treats junk as zero", () => {
    expect(priceValue("45.00")).toBe(45);
    expect(priceValue("R$ 0,00")).toBe(0);
    expect(priceValue(null)).toBe(0);
  });
});
