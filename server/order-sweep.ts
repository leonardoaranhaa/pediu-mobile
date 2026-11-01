import { expireStaleInventoryReservations, listExpiredCreditPurchases, applyCreditPurchaseStatus } from "./db";
import { orderAcceptTimeoutMs } from "./domain/order-accept";
import { cancelMercadoPagoPayment } from "./payments";
import { releaseProviderPixForOrder } from "./pix-release";

let running = false;

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
