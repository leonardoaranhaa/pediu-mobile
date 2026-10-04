import { describe, expect, it } from "vitest";
import {
  calculateCommissionCents,
  comparePaymentForReconciliation,
  formatCents,
  normalizeCurrency,
  parseAmountToCents,
} from "../server/domain/finance";

describe("financial domain", () => {
  it("parses and formats BRL without floating point drift", () => {
    expect(parseAmountToCents("42.5")).toBe(4250);
    expect(formatCents(4250)).toBe("42.50");
    expect(() => parseAmountToCents("42.999")).toThrow();
  });

  it("accepts only BRL in the first commercial phase", () => {
    expect(normalizeCurrency("brl")).toBe("BRL");
    expect(() => normalizeCurrency("USD")).toThrow();
  });

  it("calculates percentage, fixed and hybrid commission in cents", () => {
    expect(
      calculateCommissionCents(10_000, {
        type: "percentage",
        percentage: "10.0000",
        fixedAmount: "0.00",
      }),
    ).toBe(1_000);
    expect(
      calculateCommissionCents(10_000, {
        type: "fixed",
        percentage: "0.0000",
        fixedAmount: "2.50",
      }),
    ).toBe(250);
    expect(
      calculateCommissionCents(10_000, {
        type: "hybrid",
        percentage: "10.0000",
        fixedAmount: "2.50",
      }),
    ).toBe(1_250);
  });

  it("classifies matched, amount and missing-internal reconciliation records", () => {
    expect(
      comparePaymentForReconciliation({
        providerAmount: "10.00",
        providerCurrency: "BRL",
        providerStatus: "paid",
        internalAmount: "10.00",
        internalCurrency: "BRL",
        internalStatus: "paid",
        paymentExists: true,
        duplicate: false,
      }),
    ).toMatchObject({ classification: "matched" });
    expect(
      comparePaymentForReconciliation({
        providerAmount: "10.00",
        providerCurrency: "BRL",
        providerStatus: "approved",
        internalAmount: "10.00",
        internalCurrency: "BRL",
        internalStatus: "paid",
        paymentExists: true,
        duplicate: false,
      }),
    ).toMatchObject({ classification: "matched" });
    expect(
      comparePaymentForReconciliation({
        providerAmount: "11.00",
        providerCurrency: "BRL",
        providerStatus: "paid",
        internalAmount: "10.00",
        internalCurrency: "BRL",
        internalStatus: "paid",
        paymentExists: true,
        duplicate: false,
      }),
    ).toMatchObject({ classification: "amount_mismatch" });
    expect(
      comparePaymentForReconciliation({
        providerAmount: "10.00",
        providerCurrency: "BRL",
        providerStatus: "paid",
        paymentExists: false,
        duplicate: false,
      }),
    ).toMatchObject({ classification: "missing_internal" });
  });
});
