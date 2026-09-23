import crypto from "node:crypto";
import express, { type Express, type Request } from "express";
import * as db from "./db";

const WEBHOOK_STATUSES = new Set(["pending", "paid", "failed", "cancelled"] as const);
type WebhookStatus = "pending" | "paid" | "failed" | "cancelled";

type PaymentWebhookPayload = {
  provider?: string;
  eventId?: string;
  eventType?: string;
  paymentId?: number;
  transactionId?: string;
  status?: WebhookStatus;
};

function signatureMatches(req: Request, rawBody: Buffer, secret: string) {
  const received = req.header("x-pediu-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function registerPaymentWebhookRoutes(app: Express) {
  app.post("/api/webhooks/payments", express.raw({ type: "application/json", limit: "64kb" }), async (req, res) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    if (!secret) {
      res.status(503).json({ error: "Payment webhook not configured" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("", "utf8");
    if (!signatureMatches(req, rawBody, secret)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    let payload: PaymentWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as PaymentWebhookPayload;
    } catch {
      res.status(400).json({ error: "Invalid webhook JSON" });
      return;
    }

    const provider = payload.provider?.trim();
    const eventId = payload.eventId?.trim();
    const eventType = payload.eventType?.trim();
    const status = payload.status;
    if (!provider || !eventId || !eventType || !status || !WEBHOOK_STATUSES.has(status) || (!payload.paymentId && !payload.transactionId)) {
      res.status(400).json({ error: "Invalid payment webhook payload" });
      return;
    }

    try {
      const result = await db.applyPaymentWebhook({
        provider,
        providerEventId: eventId,
        eventType,
        paymentId: payload.paymentId,
        transactionId: payload.transactionId,
        status,
      });
      res.status(200).json({ ok: true, ...result });
    } catch {
      res.status(422).json({ error: "Payment webhook could not be applied" });
    }
  });
}
