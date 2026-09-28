import crypto from "node:crypto";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerPaymentWebhookRoutes } from "../server/payment-webhook";
import * as db from "../server/db";
import * as payments from "../server/payments";

const SECRET = "test-mercado-pago-webhook-secret";
const paymentId = "123456789";
const requestId = "request-unique-123";
const timestamp = "1704908010";

const canonicalPayment = {
  id: paymentId,
  status: "approved",
  transaction_amount: 42.5,
  currency_id: "BRL",
  external_reference: "pediu-order-501",
};
const localPayment = {
  paymentId: 701,
  paymentMethod: "pix",
  orderId: 501,
  orderTotal: "42.50",
  provider: "mercado_pago",
  providerTransactionId: paymentId,
  transactionAmount: "42.50",
  currency: "BRL",
  externalReference: "pediu-order-501",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
});

async function withWebhookServer<T>(
  callback: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  registerPaymentWebhookRoutes(app);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Webhook test server did not start");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function sign(id: string, xRequestId: string, ts = timestamp) {
  const manifest = `id:${id.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  return `ts=${ts},v1=${crypto
    .createHmac("sha256", SECRET)
    .update(manifest, "utf8")
    .digest("hex")}`;
}

function setupCanonical(canonical = canonicalPayment, local = localPayment) {
  vi.spyOn(payments, "getMercadoPagoPayment").mockResolvedValue(
    canonical as any,
  );
  vi.spyOn(db, "getMercadoPagoPaymentContext").mockResolvedValue(local as any);
}

async function sendWebhook(
  baseUrl: string,
  options: {
    id?: string;
    xRequestId?: string;
    xSignature?: string;
    body?: unknown;
  } = {},
) {
  const id = options.id ?? paymentId;
  const xRequestId = options.xRequestId ?? requestId;
  const body = JSON.stringify(
    options.body ?? {
      action: "payment.updated",
      type: "payment",
      data: { id },
    },
  );
  return fetch(`${baseUrl}/api/webhooks/payments?data.id=${id}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": xRequestId,
      "x-signature": options.xSignature ?? sign(id, xRequestId),
    },
    body,
  });
}

describe("Mercado Pago payment webhook boundary", () => {
  it("rejects an invalid signature before querying Mercado Pago or the database", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
    const canonical = vi.spyOn(payments, "getMercadoPagoPayment");
    const lookup = vi.spyOn(db, "getMercadoPagoPaymentContext");
    const apply = vi.spyOn(db, "applyPaymentWebhook");

    await withWebhookServer(async (baseUrl) => {
      const response = await sendWebhook(baseUrl, { xSignature: "invalid" });
      expect(response.status).toBe(401);
    });

    expect(canonical).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it("confirms only an approved canonical payment matching the local amount, currency and reference", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
    setupCanonical();
    vi.spyOn(db, "applyPaymentWebhook").mockResolvedValue({
      paymentId: 701,
      status: "paid",
      duplicate: false,
    });

    await withWebhookServer(async (baseUrl) => {
      const response = await sendWebhook(baseUrl);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        ok: true,
        paymentId: 701,
        status: "paid",
      });
    });

    expect(payments.getMercadoPagoPayment).toHaveBeenCalledWith(paymentId);
    expect(db.getMercadoPagoPaymentContext).toHaveBeenCalledWith(paymentId);
    expect(db.applyPaymentWebhook).toHaveBeenCalledWith({
      provider: "mercado_pago",
      providerEventId: requestId,
      eventType: "payment.updated",
      paymentId: 701,
      transactionId: paymentId,
      status: "paid",
    });
  });

  it.each([
    { name: "pending", canonicalStatus: "pending", expectedStatus: "pending" },
    { name: "rejected", canonicalStatus: "rejected", expectedStatus: "failed" },
  ])(
    "maps canonical $name status without trusting notification body status",
    async ({ canonicalStatus, expectedStatus }) => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
      const canonical = { ...canonicalPayment, status: canonicalStatus };
      setupCanonical(canonical);
      const status = expectedStatus as "pending" | "failed";
      vi.spyOn(db, "applyPaymentWebhook").mockResolvedValue({
        paymentId: 701,
        status,
        duplicate: false,
      });

      await withWebhookServer(async (baseUrl) => {
        const response = await sendWebhook(baseUrl, {
          body: {
            action: "payment.updated",
            type: "payment",
            status: "approved",
            data: { id: paymentId },
          },
        });
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
          status,
        });
      });

      expect(db.applyPaymentWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ status }),
      );
    },
  );

  it("deduplicates a valid webhook replay by x-request-id", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
    setupCanonical();
    const apply = vi
      .spyOn(db, "applyPaymentWebhook")
      .mockResolvedValueOnce({
        paymentId: 701,
        status: "paid",
        duplicate: false,
      })
      .mockResolvedValueOnce({
        paymentId: 701,
        status: "paid",
        duplicate: true,
      });

    await withWebhookServer(async (baseUrl) => {
      const first = await sendWebhook(baseUrl);
      const replay = await sendWebhook(baseUrl);
      expect(first.status).toBe(200);
      expect(replay.status).toBe(200);
      await expect(replay.json()).resolves.toMatchObject({ duplicate: true });
    });

    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls[0]?.[0].providerEventId).toBe(requestId);
    expect(apply.mock.calls[1]?.[0].providerEventId).toBe(requestId);
  });

  it.each([
    {
      name: "amount",
      canonical: { ...canonicalPayment, transaction_amount: 42.49 },
      local: localPayment,
    },
    {
      name: "external reference",
      canonical: { ...canonicalPayment, external_reference: "pediu-order-999" },
      local: localPayment,
    },
    {
      name: "local external reference",
      canonical: canonicalPayment,
      local: { ...localPayment, externalReference: "pediu-order-999" },
    },
  ])(
    "does not apply a canonical $name mismatch",
    async ({ canonical, local }) => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
      setupCanonical(canonical, local);
      const apply = vi.spyOn(db, "applyPaymentWebhook");

      await withWebhookServer(async (baseUrl) => {
        const response = await sendWebhook(baseUrl);
        expect(response.status).toBe(422);
      });

      expect(apply).not.toHaveBeenCalled();
    },
  );
});
