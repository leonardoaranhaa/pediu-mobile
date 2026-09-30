import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() ?? "";
const concurrency = Math.min(
  Math.max(Number(process.env.CONCURRENCY_REQUESTS ?? 12), 2),
  32,
);

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for concurrency smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for concurrency smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for concurrency smoke.");
if (!webhookSecret)
  throw new Error(
    "MERCADO_PAGO_WEBHOOK_SECRET is required for concurrency smoke.",
  );

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(
    Number.isInteger(id) && id > 0,
    "fixture insert did not return an id",
  );
  return id;
}

function unwrap<T>(body: any): T {
  if (body?.error) {
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? "tRPC request failed",
    );
  }
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

async function postTrpc<T>(
  path: string,
  input: unknown,
  token: string,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ json: input }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${path}: HTTP ${response.status} ${body?.error?.json?.message ?? body?.error?.message ?? "unknown"}`,
    );
  }
  return unwrap<T>(body);
}

async function postWebhook(body: string, eventId: string, paymentId: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const manifest = `id:${paymentId.toLowerCase()};request-id:${eventId};ts:${timestamp};`;
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest, "utf8")
    .digest("hex");
  const response = await fetch(
    `${apiBaseUrl}/api/webhooks/payments?data.id=${encodeURIComponent(paymentId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": eventId,
        "x-signature": `ts=${timestamp},v1=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload, eventId };
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-concurrency-customer-${runId}`;
  const merchantOpenId = `ci-concurrency-merchant-${runId}`;
  const idempotencyKey = `ci-concurrency-order-${runId}`;
  const eventId = `ci-concurrency-payment-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let addressId: number | undefined;
  let orderId: number | undefined;
  let paymentId: number | undefined;

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Concorrência E2E",
        `${customerOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    customerId = insertId(customerResult);
    const [merchantResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        merchantOpenId,
        "Lojista Concorrência E2E",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantId = insertId(merchantResult);
    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, phone, address, pixKey, deliveryFee, deliveryEnabled, pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        `Loja Concorrência ${runId}`,
        "11999990000",
        "Rua Concorrência, 10",
        `pix-concurrency-${runId}`,
        "4.50",
        1,
        0,
        "5.00",
        "-23.5505200",
        "-46.6333080",
        1,
      ],
    );
    storeId = insertId(storeResult);
    const [productResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Concorrência ${runId}`,
        "Lanches",
        "Fixture de idempotência concorrente",
        "12.50",
        1,
      ],
    );
    productId = insertId(productResult);

    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Concorrência E2E",
      expiresInMs: 15 * 60_000,
    });
    const merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista Concorrência E2E",
      expiresInMs: 15 * 60_000,
    });
    addressId = await postTrpc<number>(
      "pediu.addresses.create",
      {
        label: "Casa Concorrência",
        recipientName: "Cliente Concorrência E2E",
        street: "Rua Concorrência",
        number: "10",
        complement: null,
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        postalCode: "01311000",
        latitude: "-23.5505200",
        longitude: "-46.6333080",
        isDefault: true,
      },
      customerToken,
    );

    const orderInput = {
      idempotencyKey,
      storeId,
      total: "17.00",
      paymentMethod: "pix",
      addressId,
      items: [{ productId, quantity: 1, unitPrice: "12.50" }],
    };
    const orderResponses = await Promise.all(
      Array.from({ length: concurrency }, () =>
        postTrpc<{
          orderId: number;
          paymentId: number;
          status: string;
        }>("pediu.orders.create", orderInput, customerToken),
      ),
    );
    assert.equal(orderResponses.length, concurrency);
    assert.ok(orderResponses.every((result) => result.status === "Pendente"));
    const orderIds = new Set(orderResponses.map((result) => result.orderId));
    const paymentIds = new Set(
      orderResponses.map((result) => result.paymentId),
    );
    assert.deepEqual(
      [...orderIds].length,
      1,
      "concurrent checkout created multiple orders",
    );
    assert.deepEqual(
      [...paymentIds].length,
      1,
      "concurrent checkout created multiple payments",
    );
    orderId = orderResponses[0]!.orderId;
    paymentId = orderResponses[0]!.paymentId;
    const providerPaymentId = String(orderId);
    await connection.execute(
      "INSERT INTO pediu_payment_transactions (paymentId, provider, providerTransactionId, status, amount, currency, idempotencyKey, externalReference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        paymentId,
        "mercado_pago",
        providerPaymentId,
        "pending",
        "17.00",
        "BRL",
        `pix-order-${orderId}`,
        `pediu-order-${orderId}`,
      ],
    );
    await connection.execute(
      "UPDATE pediu_payments SET transactionId = ? WHERE id = ?",
      [providerPaymentId, paymentId],
    );

    const [orderRows] = await connection.execute(
      "SELECT id FROM pediu_orders WHERE idempotencyKey = ?",
      [idempotencyKey],
    );
    assert.equal((orderRows as Array<unknown>).length, 1);
    const [paymentRows] = await connection.execute(
      "SELECT id FROM pediu_payments WHERE orderId = ?",
      [orderId],
    );
    assert.equal((paymentRows as Array<unknown>).length, 1);
    const [initialTimelineRows] = await connection.execute(
      "SELECT eventType FROM pediu_delivery_events WHERE orderId = ? ORDER BY id",
      [orderId],
    );
    assert.deepEqual(initialTimelineRows, [{ eventType: "Pendente" }]);

    const statusResponses = await Promise.all([
      postTrpc(
        "pediu.orders.status",
        { orderId, status: "Aceito" },
        merchantToken,
      ),
      postTrpc(
        "pediu.orders.status",
        { orderId, status: "Aceito" },
        merchantToken,
      ),
    ]);
    assert.deepEqual(statusResponses, [{ success: true }, { success: true }]);
    const [statusTimelineRows] = await connection.execute(
      "SELECT eventType FROM pediu_delivery_events WHERE orderId = ? ORDER BY id",
      [orderId],
    );
    assert.deepEqual(statusTimelineRows, [
      { eventType: "Pendente" },
      { eventType: "Aceito" },
    ]);

    const webhookBody = JSON.stringify({
      action: "payment.updated",
      type: "payment",
      data: { id: providerPaymentId },
    });
    const webhookResponses = await Promise.all(
      Array.from({ length: concurrency }, () =>
        postWebhook(webhookBody, eventId, providerPaymentId),
      ),
    );
    assert.ok(
      webhookResponses.every((response) => response.status === 200),
      `concurrent webhook statuses: ${webhookResponses.map((response) => response.status).join(",")}`,
    );
    assert.ok(
      webhookResponses.every(
        (response) =>
          response.payload?.paymentId === paymentId &&
          response.payload?.status === "paid",
      ),
      "concurrent webhook responses must resolve to the same paid payment",
    );
    const [eventRows] = await connection.execute(
      "SELECT id FROM pediu_webhook_events WHERE provider = ? AND providerEventId = ?",
      ["mercado_pago", eventId],
    );
    assert.equal((eventRows as Array<unknown>).length, 1);
    const [paidRows] = await connection.execute(
      "SELECT status FROM pediu_payments WHERE id = ?",
      [paymentId],
    );
    assert.equal((paidRows as Array<{ status: string }>)[0]?.status, "paid");

    console.log(
      `Go-Live concurrency smoke passed: ${concurrency} concurrent checkout retries collapsed to one order/payment, status transitions persisted one atomic timeline event, and ${concurrency} duplicate webhooks collapsed to one event.`,
    );
  } finally {
    try {
      if (productId) {
        await connection.execute(
          "DELETE FROM pediu_order_items WHERE productId = ?",
          [productId],
        );
      }
      await connection.execute(
        "DELETE FROM pediu_delivery_events WHERE orderId IN (SELECT id FROM pediu_orders WHERE idempotencyKey = ?)",
        [idempotencyKey],
      );
      await connection.execute(
        "DELETE FROM pediu_commission_entries WHERE orderId IN (SELECT id FROM pediu_orders WHERE idempotencyKey = ?)",
        [idempotencyKey],
      );
      await connection.execute(
        "DELETE FROM pediu_financial_ledger WHERE orderId IN (SELECT id FROM pediu_orders WHERE idempotencyKey = ?) OR storeId IN (SELECT id FROM pediu_stores WHERE name LIKE ?)",
        [idempotencyKey, `Loja Concorrência ${runId}%`],
      );
      await connection.execute(
        "DELETE FROM pediu_payment_transactions WHERE paymentId IN (SELECT id FROM pediu_payments WHERE orderId IN (SELECT id FROM pediu_orders WHERE idempotencyKey = ?))",
        [idempotencyKey],
      );
      await connection.execute(
        "DELETE FROM pediu_payments WHERE orderId IN (SELECT id FROM pediu_orders WHERE idempotencyKey = ?)",
        [idempotencyKey],
      );
      await connection.execute(
        "DELETE FROM pediu_orders WHERE idempotencyKey = ?",
        [idempotencyKey],
      );
      await connection.execute(
        "DELETE FROM pediu_webhook_events WHERE provider = ? AND providerEventId = ?",
        ["mercado_pago", eventId],
      );
      if (addressId) {
        await connection.execute(
          "DELETE FROM pediu_customer_addresses WHERE id = ?",
          [addressId],
        );
      }
      if (productId) {
        await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
          productId,
        ]);
      }
      if (storeId) {
        await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
          storeId,
        ]);
      }
      const ids = [customerId, merchantId].filter((id): id is number =>
        Boolean(id),
      );
      if (ids.length) {
        await connection.query(
          `DELETE FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
          ids,
        );
      }
    } catch (cleanupError) {
      console.error(
        `Concurrency fixture cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : "unknown error"}`,
      );
    }
    await connection.end();
  }
}

void main().catch((error) => {
  console.error(
    `Go-Live concurrency smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
