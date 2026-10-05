export const LOYALTY_TIERS = ["bronze", "prata", "flash99"] as const;
export type LoyaltyTier = (typeof LOYALTY_TIERS)[number];

export const LOYALTY_TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: "Bronze",
  prata: "Prata",
  flash99: "Flash 99",
};

/** Points required to redeem one credit block. */
export const LOYALTY_REDEEM_BLOCK_POINTS = 100;
/** BRL credit granted per redeem block. */
export const LOYALTY_REDEEM_CREDIT_BRL = 5;

export function resolveLoyaltyTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= 1500) return "flash99";
  if (lifetimePoints >= 500) return "prata";
  return "bronze";
}

export function loyaltyEarnMultiplier(tier: LoyaltyTier): number {
  if (tier === "flash99") return 1.5;
  if (tier === "prata") return 1.2;
  return 1;
}

/** 1 point per R$ 1 eligible spend, multiplied by tier. */
export function calculateEarnPoints(eligibleSpendBrl: number, tier: LoyaltyTier): number {
  if (!Number.isFinite(eligibleSpendBrl) || eligibleSpendBrl <= 0) return 0;
  return Math.floor(eligibleSpendBrl * loyaltyEarnMultiplier(tier));
}

export function pointsToNextTier(lifetimePoints: number): { nextTier: LoyaltyTier | null; pointsNeeded: number } {
  if (lifetimePoints < 500) return { nextTier: "prata", pointsNeeded: 500 - lifetimePoints };
  if (lifetimePoints < 1500) return { nextTier: "flash99", pointsNeeded: 1500 - lifetimePoints };
  return { nextTier: null, pointsNeeded: 0 };
}

export function progressToNextTier(lifetimePoints: number): number {
  if (lifetimePoints < 500) return Math.min(1, lifetimePoints / 500);
  if (lifetimePoints < 1500) return Math.min(1, (lifetimePoints - 500) / 1000);
  return 1;
}

export type RedeemResult =
  | { ok: true; blocks: number; pointsSpent: number; creditAmount: string }
  | { ok: false; reason: string };

export function planLoyaltyRedeem(points: number, blocks = 1): RedeemResult {
  if (!Number.isInteger(blocks) || blocks < 1 || blocks > 20) {
    return { ok: false, reason: "Quantidade de resgate inválida" };
  }
  const pointsSpent = blocks * LOYALTY_REDEEM_BLOCK_POINTS;
  if (!Number.isInteger(points) || points < pointsSpent) {
    return { ok: false, reason: "Pontos insuficientes para resgate" };
  }
  return {
    ok: true,
    blocks,
    pointsSpent,
    creditAmount: (blocks * LOYALTY_REDEEM_CREDIT_BRL).toFixed(2),
  };
}
