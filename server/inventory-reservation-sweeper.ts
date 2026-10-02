import { expireStaleInventoryReservations } from "./db";

const DEFAULT_TTL_MINUTES = 30;
const DEFAULT_INTERVAL_SECONDS = 60;

function positiveNumberFromEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed) || parsed < minimum) return fallback;
  return Math.min(parsed, maximum);
}

export function startInventoryReservationSweeper(): () => void {
  if (!process.env.DATABASE_URL?.trim()) return () => undefined;

  const ttlMs =
    positiveNumberFromEnv(
      "INVENTORY_RESERVATION_TTL_MINUTES",
      DEFAULT_TTL_MINUTES,
      1,
      24 * 60,
    ) * 60_000;
  const intervalMs =
    positiveNumberFromEnv(
      "INVENTORY_RESERVATION_SWEEP_INTERVAL_SECONDS",
      DEFAULT_INTERVAL_SECONDS,
      10,
      60 * 60,
    ) * 1_000;
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const expiredOrderIds = await expireStaleInventoryReservations({ ttlMs });
      if (expiredOrderIds.length > 0) {
        console.info(
          `[Inventory] Expired ${expiredOrderIds.length} stale reservation(s): ${expiredOrderIds.join(",")}`,
        );
      }
    } catch (error) {
      console.error("[Inventory] Reservation sweeper failed", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void run(), intervalMs);
  timer.unref?.();
  void run();
  return () => clearInterval(timer);
}
