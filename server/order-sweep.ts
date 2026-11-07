import { expireStaleInventoryReservations, listExpiredCreditPurchases, listRecentCancelledPix, applyCreditPurchaseStatus } from "./db";
import { orderAcceptTimeoutMs } from "./domain/order-accept";
import { cancelMercadoPagoPayment } from "./payments";
import { releaseProviderPixForOrder } from "./pix-release";

let running = false;
const releasedCancelledPix = new Set<number>();

export async function sweepUnacceptedOrders() {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (running) return;
  running = true;
  try {
    const expired = await expireStaleInventoryReservations({ ttlMs: orderAcceptTimeoutMs() });
    for (const orderId of expired) {
      try {
        await releaseProviderPixForOrder(orderId);
      } catch (error) {
        console.warn("[PIX] Failed to cancel the charge for order", orderId, error);
      }
    }
    const recentCancelled = await listRecentCancelledPix(new Date(Date.now() - 48 * 60 * 60 * 1000));
    for (const row of recentCancelled) {
      if (releasedCancelledPix.has(row.orderId)) continue;
      releasedCancelledPix.add(row.orderId);
      try {
        await releaseProviderPixForOrder(row.orderId);
      } catch (error) {
        releasedCancelledPix.delete(row.orderId);
        console.warn("[PIX] Failed to close a charge for a cancelled order", row.orderId, error);
      }
    }
    const staleCredits = await listExpiredCreditPurchases();
    for (const purchase of staleCredits) {
      try {
        if (purchase.providerTransactionId) {
          await cancelMercadoPagoPayment(purchase.providerTransactionId);
        }
        await applyCreditPurchaseStatus({ purchaseId: purchase.id, status: "cancelled" });
      } catch (error) {
        console.warn("[PIX] Failed to expire ad credit charge", purchase.id, error);
      }
    }
  } catch (error) {
    console.warn("[Orders] Sweep of unaccepted orders failed", error);
  } finally {
    running = false;
  }
}
