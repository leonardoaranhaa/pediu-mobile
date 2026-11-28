import { describe, expect, it } from "vitest";
import { minimumOrderShortfall } from "../shared/pilot-ops";

describe("store minimum order", () => {
  it("blocks an items subtotal below the minimum and says how much is missing", () => {
    expect(minimumOrderShortfall(44, "100.00")).toBe(
      "O pedido mínimo desta loja é R$ 100,00. Faltam R$ 56,00 em produtos.",
    );
  });

  it("lets the order through at or above the minimum", () => {
    expect(minimumOrderShortfall(100, "100.00")).toBeNull();
    expect(minimumOrderShortfall(120.5, "100")).toBeNull();
  });

  it("treats a missing or zero minimum as no minimum", () => {
    expect(minimumOrderShortfall(1, "0.00")).toBeNull();
    expect(minimumOrderShortfall(1, null)).toBeNull();
    expect(minimumOrderShortfall(1, undefined)).toBeNull();
  });

  it("compares in cents, so float sums do not block an exact minimum", () => {
    expect(minimumOrderShortfall(0.1 + 0.2 + 29.7, "30.00")).toBeNull();
  });
});
