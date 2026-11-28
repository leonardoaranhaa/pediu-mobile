import * as db from "./db";
import { cancelMercadoPagoPayment, requestPixRefund } from "./payments";
import { sendPushToUser } from "./push";
import { formatMoney } from "../shared/pilot-ops";

type RefundInput = {
  paymentId: number;
  orderId: number;
  transactionId: string;
  amount: string;
  idempotencyKey: string;
  reason: string;
};

/**
 * Records a PIX refund in `pediu_refunds`, asks the provider for it and stores
 * the outcome. The same idempotency key returns the existing refund, so a
 * retried cancellation or webhook never refunds twice. `created` is false when
 * the refund already existed.
 */
export async function refundPixPayment(input: RefundInput) {
  const provider = (process.env.PIX_PROVIDER ?? "manual").trim().toLowerCase();
  const refund = await db.createPaymentRefund({
    paymentId: input.paymentId,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    provider,
  });
  if (refund.status !== "pending") return { refund, created: false as const };
  try {
    const result = await requestPixRefund({ ...input, paymentId: refund.paymentId });
    const updated = await db.updatePaymentRefund(refund.id, result);
    return { refund: updated, created: true as const };
  } catch (error) {
    await db.updatePaymentRefund(refund.id, { status: "failed" });
    throw error;
  }
}

/** What the customer reads once a refund was requested; never claims money moved before the provider confirms. */
export function refundNotice(status: string, amount: string, paidAfterCancel: boolean) {
  const reason = paidAfterCancel ? "O PIX chegou depois que o pedido foi cancelado." : "O pedido foi cancelado.";
  return status === "refunded"
    ? { title: "PIX estornado", body: `${reason} Os ${formatMoney(amount)} já foram devolvidos para a sua conta.` }
    : { title: "Estorno do PIX pedido", body: `${reason} Pedimos o estorno de ${formatMoney(amount)}. O valor volta para a sua conta assim que o banco confirmar.` };
}

export async function releaseProviderPixForOrder(orderId: number) {
  const context = await db.getOrderPaymentContext(orderId);
  const transactionId = context?.payment.transactionId?.trim();
  if (!context || !transactionId || context.payment.method !== "pix") return;
  const outcome = await cancelMercadoPagoPayment(transactionId);
  if (outcome !== "paid") return;
  let result: Awaited<ReturnType<typeof refundPixPayment>>;
  try {
    result = await refundPixPayment({
      paymentId: context.payment.id,
      orderId,
      transactionId,
      amount: context.total,
      idempotencyKey: `pix-refund-cancelled-${orderId}`,
      reason: "Pedido cancelado",
    });
  } catch (error) {
    // The failed refund stays in pediu_refunds for the admin to retry; the customer is not told money moved.
    console.error("[PIX] Refund for a cancelled order failed", { orderId, error });
    return;
  }
  if (!result.created) return;
  const notice = refundNotice(result.refund.status, context.total, false);
  try {
    await sendPushToUser(context.customerId, notice.title, notice.body, {
      type: "payment",
      orderId,
      status: result.refund.status,
    });
  } catch (error) {
    console.warn("[PIX] Failed to notify the refund", error);
  }
}
