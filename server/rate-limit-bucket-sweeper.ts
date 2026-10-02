import * as db from "./db";
import {
  boundedRateLimitCleanupInterval,
  DEFAULT_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS,
  DEFAULT_DISTRIBUTED_RATE_LIMIT_CLEANUP_BATCH,
} from "./domain/distributed-rate-limit";

function configuredInterval(): number {
  const parsed = Number(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS);
  return boundedRateLimitCleanupInterval(
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_DISTRIBUTED_RATE_LIMIT_INTERVAL_MS,
  );
}

function configuredBatch(): number {
  const parsed = Number(process.env.RATE_LIMIT_CLEANUP_BATCH);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DISTRIBUTED_RATE_LIMIT_CLEANUP_BATCH;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 5_000);
}

export async function cleanExpiredRateLimitBuckets(): Promise<number> {
  return db.deleteExpiredRateLimitBuckets(configuredBatch());
}

export function startRateLimitBucketSweeper(): () => void {
  const intervalMs = configuredInterval();
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const deleted = await cleanExpiredRateLimitBuckets();
      if (deleted > 0) {
        console.log(
          `[Security] Removed ${deleted} expired rate-limit bucket(s)`,
        );
      }
    } catch (error) {
      console.error("[Security] Rate-limit bucket cleanup failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  void run();
  return () => clearInterval(timer);
}
