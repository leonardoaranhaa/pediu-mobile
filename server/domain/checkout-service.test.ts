import { describe, expect, it } from "vitest";
import { buildServerQuote } from "./checkout-service";

describe("buildServerQuote", () => {
  it("uses database prices instead of client prices", () => {
    const quote = buildServerQuote({
      products: [{ id: 1, price: "12.50", available: 1, storeId: 10 }],
      requested: [{ productId: 1, quantity: 2 }], deliveryFee: "5.00", serviceFee: "1.50"
    });
    expect(quote.subtotal).toBe("25.00");
    expect(quote.total).toBe("31.50");
  });

  it("rejects unavailable products", () => {
    expect(() => buildServerQuote({ products: [{ id: 1, price: "10.00", available: 0, storeId: 10 }], requested: [{ productId: 1, quantity: 1 }], deliveryFee: "0.00" })).toThrow("Produto indisponível");
  });
});
