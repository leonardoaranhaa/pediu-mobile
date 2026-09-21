import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "../server/domain/coupons";

const baseCoupon = {
  code: "BEMVINDO10",
  type: "percentage",
  value: "10.00",
  minSubtotal: "20.00",
  maxDiscount: "10.00",
  active: 1,
  expiresAt: null,
};

describe("coupon domain", () => {
  it("calculates a percentage discount", () => {
    expect(calculateCouponDiscount(baseCoupon, 100)).toMatchObject({ valid: true, code: "BEMVINDO10", discount: "10.00" });
  });

  it("respects the minimum subtotal", () => {
    expect(calculateCouponDiscount(baseCoupon, 19.99)).toMatchObject({ valid: false, discount: "0.00", reason: "Valor mínimo não atingido" });
  });

  it("caps a percentage discount at the maximum value", () => {
    expect(calculateCouponDiscount(baseCoupon, 200)).toMatchObject({ valid: true, discount: "10.00" });
  });

  it("rejects inactive and expired coupons", () => {
    expect(calculateCouponDiscount({ ...baseCoupon, active: 0 }, 100).valid).toBe(false);
    expect(calculateCouponDiscount({ ...baseCoupon, expiresAt: new Date(0) }, 100).valid).toBe(false);
  });
});
