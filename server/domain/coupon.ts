export type CouponRule = { code: string; type: "fixed" | "percentage"; value: number; minSubtotalCents?: number; maxDiscountCents?: number; active: boolean };
export function calculateCouponDiscount(rule: CouponRule, subtotalCents: number): number {
  if (!rule.active || subtotalCents < (rule.minSubtotalCents ?? 0)) return 0;
  const raw = rule.type === "percentage" ? Math.round(subtotalCents * rule.value / 100) : Math.round(rule.value);
  return Math.max(0, Math.min(raw, subtotalCents, rule.maxDiscountCents ?? raw));
}
