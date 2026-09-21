import { describe, expect, it } from "vitest";
import { assertAddressOwner } from "../server/domain/customer-addresses";
import { calculateCheckoutQuote } from "../server/domain/checkout-quote";

describe("customer address domain", () => {
  it("rejects access to another user's address", () => {
    expect(() => assertAddressOwner(10, 20)).toThrow("Forbidden");
  });

  it("calculates quote from server-resolved prices", () => {
    expect(calculateCheckoutQuote(
      [{ unitPrice: "10.00", quantity: 2 }, { unitPrice: "3.50", quantity: 1 }],
      "5.00",
      "1.50",
      "2.00",
    )).toMatchObject({ subtotal: "23.50", deliveryFee: "5.00", serviceFee: "1.50", discount: "2.00", total: "28.00", currency: "BRL" });
  });
});
