import * as db from "./db";
import { cancelMercadoPagoPayment, requestPixRefund } from "./payments";
import { sendPushToUser } from "./push";

export async function releaseProviderPixForOrder(orderId: number) {
  const context = await db.getOrderPaymentContext(orderId);
  const transactionId = context?.payment.transactionId?.trim();
  if (!context || !transactionId || context.payment.method !== "pix") return;
  const outcome = await cancelMercadoPagoPayment(transactionId);
  if (outcome !== "paid") return;
  await requestPixRefund({
    paymentId: context.payment.id,
    orderId,
    transactionId,
    amount: context.total,
    idempotencyKey: `pix-refund-cancelled-${orderId}`,
    reason: "Pedido cancelado",
  });
  try {
    await sendPushToUser(
      context.customerId,
      "PIX estornado",
      "O pedido já estava cancelado. O valor do PIX foi estornado.",
      { type: "payment", orderId, status: "refunded" },
    );
  } catch (error) {
    console.warn("[PIX] Failed to notify the refund", error);
  }
}
