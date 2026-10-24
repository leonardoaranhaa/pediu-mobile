export const DEFAULT_DISPATCH_OFFER_TTL_MS = 10 * 60_000;
export const MIN_DISPATCH_OFFER_TTL_MS = 60_000;
export const MAX_DISPATCH_OFFER_TTL_MS = 120 * 60_000;

export function boundedDispatchOfferTtl(ttlMs = DEFAULT_DISPATCH_OFFER_TTL_MS) {
  if (!Number.isFinite(ttlMs)) return DEFAULT_DISPATCH_OFFER_TTL_MS;
  return Math.min(
    Math.max(Math.trunc(ttlMs), MIN_DISPATCH_OFFER_TTL_MS),
    MAX_DISPATCH_OFFER_TTL_MS,
  );
}

export function dispatchOfferExpiresAt(
  now: Date,
  ttlMs = DEFAULT_DISPATCH_OFFER_TTL_MS,
) {
  return new Date(now.getTime() + boundedDispatchOfferTtl(ttlMs));
}

export function dispatchReofferKey(orderId: number, courierUserId: number) {
  return `dispatch-reoffer-${orderId}-${courierUserId}`;
}

export function offerStillBlocksCourier(
  status: string,
  expiresAt: Date | string | null | undefined,
  now: Date,
) {
  if (status === "accepted") return true;
  if (status !== "pending") return false;
  if (!expiresAt) return true;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry.getTime() > now.getTime();
}
