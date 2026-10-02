export const DEFAULT_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS = 60_000;
export const MIN_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS = 5_000;
export const MAX_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS = 5 * 60_000;
export const DEFAULT_DISTRIBUTED_RATE_LIMIT_CLEANUP_BATCH = 500;

export type DistributedRateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
};

export type DistributedRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export function boundedRateLimitWindow(windowMs: number): number {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    return DEFAULT_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS;
  }
  return Math.min(Math.max(Math.floor(windowMs), 1_000), 24 * 60 * 60_000);
}

export function boundedRateLimitLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 1;
  return Math.min(Math.max(Math.floor(limit), 1), 100_000);
}

export function boundedRateLimitCleanupInterval(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return DEFAULT_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS;
  }
  return Math.min(
    Math.max(Math.floor(intervalMs), MIN_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS),
    MAX_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS,
  );
}

export function retryAfterSeconds(expiresAt: Date, now = new Date()): number {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}

export function distributedRateLimitKey(
  scope: string,
  subject: string,
  networkIdentity: string,
): string {
  const normalizedScope = scope.trim().replace(/[^a-zA-Z0-9:_-]/g, "_");
  const normalizedSubject = subject.trim().replace(/[^a-zA-Z0-9:_-]/g, "_");
  const normalizedNetwork = networkIdentity
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "_");
  return `${normalizedScope}:${normalizedSubject}:${normalizedNetwork}`.slice(
    0,
    255,
  );
}

export function decideDistributedRateLimit(
  requestCount: number,
  limit: number,
  expiresAt: Date,
  now = new Date(),
): DistributedRateLimitDecision {
  const boundedLimit = boundedRateLimitLimit(limit);
  if (requestCount >= boundedLimit) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(expiresAt, now),
      remaining: 0,
    };
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, boundedLimit - requestCount - 1),
  };
}
