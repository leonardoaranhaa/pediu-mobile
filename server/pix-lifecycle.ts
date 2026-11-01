export const PIX_TTL_MS = 30 * 60 * 1000;

export function pixExpiresAt(now = new Date()) {
  return new Date(now.getTime() + PIX_TTL_MS).toISOString();
}

export function classifyPendingOrder(input: {
  createdAt: Date;
  updatedAt: Date;
  paymentMethod: string | null;
  paymentStatus: string | null;
  now: Date;
  acceptTtlMs: number;
  pixTtlMs: number;
}): "keep" | "accept_timeout" | "pix_expired" {
  const pix = input.paymentMethod === "pix";
  const pendingPix = pix && input.paymentStatus === "pending";
  if (pendingPix) {
    return input.createdAt.getTime() + input.pixTtlMs <= input.now.getTime()
      ? "pix_expired"
      : "keep";
  }
  const clock = pix && input.paymentStatus === "paid" ? input.updatedAt : input.createdAt;
  return clock.getTime() + input.acceptTtlMs <= input.now.getTime()
    ? "accept_timeout"
    : "keep";
}

export function orderVisibleToStore(payment: { method: string; status: string } | null) {
  if (!payment) return true;
  return !(payment.method === "pix" && payment.status === "pending");
}
