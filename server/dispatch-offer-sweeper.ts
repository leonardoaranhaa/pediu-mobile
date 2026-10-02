import { expireAndReofferDeliveryOffers } from "./db";
import {
  boundedDispatchOfferTtl,
  DEFAULT_DISPATCH_OFFER_TTL_MS,
} from "./domain/dispatch";

const DEFAULT_INTERVAL_SECONDS = 30;
const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 300;

function positiveIntegerFromEnv(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max)
    return fallback;
  return parsed;
}

let running = false;

export function startDispatchOfferSweeper(): () => void {
  const ttlMs = boundedDispatchOfferTtl(
    Number(process.env.DISPATCH_OFFER_TTL_MINUTES ?? 10) * 60_000 ||
      DEFAULT_DISPATCH_OFFER_TTL_MS,
  );
  const intervalSeconds = positiveIntegerFromEnv(
    process.env.DISPATCH_OFFER_SWEEP_INTERVAL_SECONDS,
    DEFAULT_INTERVAL_SECONDS,
    MIN_INTERVAL_SECONDS,
    MAX_INTERVAL_SECONDS,
  );
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const expired = await expireAndReofferDeliveryOffers({
        ttlMs,
        limit: 100,
      });
      const reoffers = expired.filter((item) => item.reoffer).length;
      if (expired.length > 0) {
        console.log(
          `[Dispatch] Expired ${expired.length} offer(s), created ${reoffers} reoffer(s)`,
        );
      }
    } catch (error) {
      console.error("[Dispatch] Offer sweeper failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, intervalSeconds * 1_000);
  timer.unref?.();
  void run();
  return () => clearInterval(timer);
}
