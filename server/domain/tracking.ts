export const DEFAULT_TRACKING_FRESH_WINDOW_MS = 60_000;
export const MAX_TRACKING_STALE_WINDOW_MS = 15 * 60_000;
export const MAX_TRACKING_FUTURE_SKEW_MS = 2 * 60_000;

export type TrackingFreshness = "fresh" | "stale" | "unavailable";

export function isTrackingCapturedAtAcceptable(
  capturedAt: Date,
  now = new Date(),
): boolean {
  const timestamp = capturedAt.getTime();
  const current = now.getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(current)) return false;
  return (
    timestamp <= current + MAX_TRACKING_FUTURE_SKEW_MS &&
    current - timestamp <= MAX_TRACKING_STALE_WINDOW_MS
  );
}

export function trackingAgeSeconds(
  capturedAt: Date | null | undefined,
  now = new Date(),
): number | null {
  if (!capturedAt) return null;
  const delta = now.getTime() - capturedAt.getTime();
  if (!Number.isFinite(delta)) return null;
  return Math.max(0, Math.floor(delta / 1000));
}

export function classifyTrackingFreshness(
  capturedAt: Date | null | undefined,
  now = new Date(),
): TrackingFreshness {
  const ageMs = capturedAt ? now.getTime() - capturedAt.getTime() : NaN;
  if (!Number.isFinite(ageMs) || ageMs < -MAX_TRACKING_FUTURE_SKEW_MS) {
    return "unavailable";
  }
  if (ageMs <= DEFAULT_TRACKING_FRESH_WINDOW_MS) return "fresh";
  if (ageMs <= MAX_TRACKING_STALE_WINDOW_MS) return "stale";
  return "unavailable";
}
