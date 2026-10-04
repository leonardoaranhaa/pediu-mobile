import crypto from "node:crypto";
import express, { type Express, type Request } from "express";
import * as db from "./db";
import { getMercadoPagoPayment } from "./payments";

const PAYMENT_PROVIDER = "mercado_pago";
const WEBHOOK_STATUSES = new Set([
  "pending",
  "paid",
  "failed",
  "cancelled",
] as const);
type WebhookStatus = "pending" | "paid" | "failed" | "cancelled";

type NotificationPayload = {
  action?: string;
  type?: string;
  data?: { id?: string | number };
};

function queryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function paymentIdFromRequest(req: Request, payload: NotificationPayload) {
  const fromQuery =
    queryValue(req.query["data.id"]) ?? queryValue(req.query.data_id);
  const fromBody =
    payload.data?.id === undefined ? undefined : String(payload.data.id);
  if (fromQuery && fromBody && fromQuery !== fromBody) return undefined;
  const id = fromQuery ?? fromBody;
  return id && /^\d{1,32}$/.test(id) ? id : undefined;
}

function signatureMatches(
  signature: string,
  requestId: string,
  paymentId: string,
  secret: string,
) {
  const parts = new Map<string, string[]>();
  for (const component of signature.split(",")) {
    const separator = component.indexOf("=");
    if (separator < 0) continue;
    const key = component.slice(0, separator).trim();
    const value = component.slice(separator + 1).trim();
    if (!key || !value) continue;
    parts.set(key, [...(parts.get(key) ?? []), value]);
  }
  const timestamp = parts.get("ts")?.[0];
  const signatures = parts.get("v1") ?? [];
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    return false;
  }

  const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest, "utf8")
    .digest();
  return signatures.some((candidate) => {
    if (!/^[a-f\d]{64}$/i.test(candidate)) return false;
    const received = Buffer.from(candidate, "hex");
    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(received, expected)
    );
  });
}

function statusFromCanonical(status: string): WebhookStatus | undefined {
  if (status === "approved") return "paid";
  if (status === "rejected") return "failed";
  if (status === "cancelled") return "cancelled";
  if (
    ["pending", "in_process", "in_mediation", "authorized"].includes(status)
  ) {
    return "pending";
  }
  return undefined;
}

function amountInCents(value: string | number | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function mercadoPagoPaymentMatchesLocal(
  canonical: {
    id: string | number;
    status: string;
    transaction_amount: string | number;
    currency_id: string;
    external_reference?: string | null;
  },
  local: {
    paymentId: number;
    paymentMethod: string;
    orderId: number;
    orderTotal: string | number;
    provider: string;
    providerTransactionId: string | null;
    transactionAmount: string | number;
    currency: string;
    externalReference: string | null;
  },
  notifiedPaymentId: string,
) {
  const expectedReference = `pediu-order-${local.orderId}`;
  const canonicalAmount = amountInCents(canonical.transaction_amount);
  const localTransactionAmount = amountInCents(local.transactionAmount);
  const localOrderAmount = amountInCents(local.orderTotal);
  return (
    String(canonical.id) === notifiedPaymentId &&
    local.provider === PAYMENT_PROVIDER &&
    local.paymentMethod === "pix" &&
    local.providerTransactionId === notifiedPaymentId &&
    local.externalReference === expectedReference &&
    canonical.external_reference === expectedReference &&
    canonicalAmount !== undefined &&
    localTransactionAmount !== undefined &&
    localOrderAmount !== undefined &&
    canonicalAmount === localTransactionAmount &&
    canonicalAmount === localOrderAmount &&
    canonical.currency_id === "BRL" &&
    local.currency === "BRL"
  );
}

export function registerPaymentWebhookRoutes(app: Express) {
  app.post(
    "/api/webhooks/payments",
    express.raw({ type: "application/json", limit: "64kb" }),
    async (req, res) => {
      const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
      if (!secret) {
        res.status(503).json({ error: "Mercado Pago webhook not configured" });
        return;
      }

      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from("", "utf8");
      let payload: NotificationPayload;
      try {
        payload = JSON.parse(rawBody.toString("utf8")) as NotificationPayload;
      } catch {
        res.status(400).json({ error: "Invalid webhook JSON" });
        return;
      }

      const paymentId = paymentIdFromRequest(req, payload);
      const requestId = req.header("x-request-id")?.trim();
      const signature = req.header("x-signature") ?? "";
      if (!paymentId || !requestId) {
        res.status(400).json({ error: "Invalid Mercado Pago notification" });
        return;
      }
      if (!signatureMatches(signature, requestId, paymentId, secret)) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }

      let canonical;
      try {
        canonical = await getMercadoPagoPayment(paymentId);
      } catch {
        res.status(502).json({ error: "Canonical Mercado Pago lookup failed" });
        return;
      }

      let local;
      try {
        local = await db.getMercadoPagoPaymentContext(paymentId);
      } catch {
        res.status(503).json({ error: "Local payment lookup failed" });
        return;
      }
      if (
        !local ||
        !mercadoPagoPaymentMatchesLocal(canonical, local, paymentId)
      ) {
        res
          .status(422)
          .json({ error: "Canonical payment does not match local order" });
        return;
      }

      const status = statusFromCanonical(canonical.status);
      if (!status || !WEBHOOK_STATUSES.has(status)) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      try {
        const result = await db.applyPaymentWebhook({
          provider: PAYMENT_PROVIDER,
          providerEventId: requestId,
          eventType:
            payload.action?.trim() || payload.type?.trim() || "payment.updated",
          paymentId: local.paymentId,
          transactionId: paymentId,
          amount: String(canonical.transaction_amount),
          currency: "BRL",
          status,
        });
        res.status(200).json({ ok: true, ...result });
      } catch {
        res.status(422).json({ error: "Payment webhook could not be applied" });
      }
    },
  );
}
