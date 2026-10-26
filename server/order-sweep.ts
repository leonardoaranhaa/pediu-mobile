import { expireStaleInventoryReservations } from "./db";
import { orderAcceptTimeoutMs } from "./domain/order-accept";

let running = false;

export async function sweepUnacceptedOrders() {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (running) return;
  running = true;
  try {
    await expireStaleInventoryReservations({ ttlMs: orderAcceptTimeoutMs() });
  } catch (error) {
    console.warn("[Orders] Sweep of unaccepted orders failed", error);
  } finally {
    running = false;
  }
}
