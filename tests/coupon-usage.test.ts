import { describe, expect, it } from "vitest";
import {
  COUPON_ALREADY_USED_REASON,
  COUPON_EXHAUSTED_REASON,
  COUPON_NOT_YOURS_REASON,
  couponUsageRejection,
} from "../server/domain/coupons";

const base = { usageLimit: null, perUserLimit: 1, usedCount: 0, ownerUserId: null };

describe("coupon usage limits", () => {
  it("lets a customer use a fresh public coupon", () => {
    expect(couponUsageRejection(base, 7, 0)).toBeNull();
  });

  it("refuses a second use by the same customer", () => {
    expect(couponUsageRejection(base, 7, 1)).toBe(COUPON_ALREADY_USED_REASON);
  });

  it("allows repeated use when there is no per-customer cap", () => {
    expect(couponUsageRejection({ ...base, perUserLimit: null }, 7, 5)).toBeNull();
  });

  it("refuses once the total limit is reached", () => {
    expect(couponUsageRejection({ ...base, usageLimit: 3, usedCount: 3 }, 7, 0)).toBe(
      COUPON_EXHAUSTED_REASON,
    );
  });

  it("keeps a personal coupon to its owner", () => {
    const personal = { ...base, ownerUserId: 7, usageLimit: 1 };
    expect(couponUsageRejection(personal, 8, 0)).toBe(COUPON_NOT_YOURS_REASON);
    expect(couponUsageRejection(personal, 7, 0)).toBeNull();
  });
});
