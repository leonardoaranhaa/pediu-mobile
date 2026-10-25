import { expireAndReofferDeliveryOffers, expireStaleInventoryReservations } from "./db";
import { orderAcceptTimeoutMs } from "./domain/order-accept";
import {
  boundedDispatchOfferTtl,
  DEFAULT_DISPATCH_OFFER_TTL_MS,
} from "./domain/dispatch";
import { processOneNotificationOutboxItem } from "./notification-outbox-worker";
import { cleanExpiredRateLimitBuckets } from "./rate-limit-bucket-sweeper";

const NOTIFICATION_CATCH_UP_LIMIT = 25;

function minutesToMs(name: string, fallbackMinutes: number) {
  const parsed = Number(process.env[name]);
  const minutes =
    Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMinutes;
  return minutes * 60_000;
}

export async function runWorkerCatchUp() {
  const offers = await expireAndReofferDeliveryOffers({
    ttlMs: boundedDispatchOfferTtl(
      minutesToMs("DISPATCH_OFFER_TTL_MINUTES", 10) ||
        DEFAULT_DISPATCH_OFFER_TTL_MS,
    ),
    limit: 100,
  });
  const inventory = await expireStaleInventoryReservations({
    ttlMs: orderAcceptTimeoutMs(),
  });
  const buckets = await cleanExpiredRateLimitBuckets();
  let notifications = 0;
  for (let index = 0; index < NOTIFICATION_CATCH_UP_LIMIT; index += 1) {
    const processed = await processOneNotificationOutboxItem();
    if (!processed) break;
    notifications += 1;
  }
  return {
    offers: offers.length,
    inventory: inventory.length,
    buckets,
    notifications,
  };
}
