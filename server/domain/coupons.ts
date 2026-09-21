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
