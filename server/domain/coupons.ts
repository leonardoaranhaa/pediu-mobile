export type CouponForCalculation = {
  code: string;
  type: string;
  value: string | number;
  minSubtotal: string | number;
  maxDiscount: string | number | null;
  active: number;
  expiresAt: Date | null;
};

export type CouponCalculation = {
  valid: boolean;
  code?: string;
  discount: string;
  reason?: string;
};

export function calculateCouponDiscount(coupon: CouponForCalculation | undefined, subtotal: number, now = Date.now()): CouponCalculation {
  if (!coupon || coupon.active !== 1 || (coupon.expiresAt && coupon.expiresAt.getTime() <= now)) {
    return { valid: false, discount: "0.00", reason: "Cupom inválido, inativo ou expirado" };
  }

  const subtotalCents = Math.round(subtotal * 100);
  const minimumCents = Math.round(Number(coupon.minSubtotal) * 100);
  if (subtotalCents < minimumCents) {
    return { valid: false, discount: "0.00", reason: "Valor mínimo não atingido" };
  }

  const rawCents = coupon.type === "percentage"
    ? Math.round(subtotalCents * Number(coupon.value) / 100)
    : Math.round(Number(coupon.value) * 100);
  const capCents = coupon.maxDiscount == null ? rawCents : Math.round(Number(coupon.maxDiscount) * 100);
  const discountCents = Math.min(rawCents, subtotalCents, capCents);

  return { valid: true, code: coupon.code, discount: (discountCents / 100).toFixed(2) };
}

export type CouponUsage = {
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  ownerUserId: number | null;
};

export const COUPON_EXHAUSTED_REASON = "Este cupom já atingiu o limite de usos";
export const COUPON_ALREADY_USED_REASON = "Você já usou este cupom";
export const COUPON_NOT_YOURS_REASON = "Este cupom é pessoal e pertence a outra conta";

/**
 * Checks the limits a coupon carries for one customer. `userUses` counts the
 * customer's orders that still hold this coupon (cancelled orders give it back).
 */
export function couponUsageRejection(
  coupon: CouponUsage,
  userId: number,
  userUses: number,
): string | null {
  if (coupon.ownerUserId != null && coupon.ownerUserId !== userId) return COUPON_NOT_YOURS_REASON;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return COUPON_EXHAUSTED_REASON;
  if (coupon.perUserLimit != null && userUses >= coupon.perUserLimit) return COUPON_ALREADY_USED_REASON;
  return null;
}
