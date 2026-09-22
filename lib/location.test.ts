import { describe, expect, it } from "vitest";
import { formatCompleteAddress, formatShortAddress } from "./location-format";

describe("location formatting", () => {
  it("builds a complete address from reverse geocoding fields", () => {
    expect(formatCompleteAddress({
      street: "Rua das Flores",
      streetNumber: "42",
      district: "Centro",
      city: "São Paulo",
      region: "SP",
      postalCode: "01000-000",
    })).toBe("Rua das Flores, 42 · Centro · São Paulo/SP · 01000-000");
  });

  it("falls back to locality for the compact location label", () => {
    expect(formatShortAddress({ district: "Pinheiros", city: "São Paulo" })).toBe("Pinheiros, São Paulo");
    expect(formatShortAddress(undefined)).toBe("Localização atual");
  });
});
