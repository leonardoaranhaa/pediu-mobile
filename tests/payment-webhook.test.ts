import crypto from "node:crypto";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerPaymentWebhookRoutes } from "../server/payment-webhook";
import * as db from "../server/db";

const SECRET = "test-payment-webhook-secret";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PAYMENT_WEBHOOK_SECRET;
});

async function withWebhookServer<T>(callback: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  registerPaymentWebhookRoutes(app);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Webhook test server did not start");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function sign(body: string) {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("payment webhook boundary", () => {
  it("rejects an invalid signature before touching the database", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = SECRET;
    const apply = vi.spyOn(db, "applyPaymentWebhook");
    await withWebhookServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/webhooks/payments`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-pediu-signature": "invalid" },
        body: JSON.stringify({ provider: "pix", eventId: "evt-1", eventType: "payment.paid", paymentId: 10, status: "paid" }),
      });
      expect(response.status).toBe(401);
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("accepts the raw-body HMAC and returns duplicate state from the idempotent application", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = SECRET;
    vi.spyOn(db, "applyPaymentWebhook").mockResolvedValue({ paymentId: 10, status: "paid", duplicate: true });
    const body = JSON.stringify({ provider: "pix", eventId: "evt-1", eventType: "payment.paid", paymentId: 10, status: "paid" });

    await withWebhookServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/webhooks/payments`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-pediu-signature": sign(body) },
        body,
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, paymentId: 10, status: "paid", duplicate: true });
    });

    expect(db.applyPaymentWebhook).toHaveBeenCalledWith({
      provider: "pix",
      providerEventId: "evt-1",
      eventType: "payment.paid",
      paymentId: 10,
      transactionId: undefined,
      status: "paid",
    });
  });
});
