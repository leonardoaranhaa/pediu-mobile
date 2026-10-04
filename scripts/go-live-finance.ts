import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for finance smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for finance smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for finance smoke.");

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

async function callTrpc<T>(
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

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-finance-customer-${runId}`;
  const merchantOpenId = `ci-finance-merchant-${runId}`;
  const adminOpenId = `ci-finance-admin-${runId}`;
  const refundKey = `ci-finance-refund-${runId}`;
  const reconciliationKey = `ci-finance-reconciliation-${runId}`;
  let providerTransactionId: string | undefined;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let adminId: number | undefined;
  let storeId: number | undefined;
  let orderId: number | undefined;
  let paymentId: number | undefined;
  let transactionRowId: number | undefined;

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Financeiro E2E",
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
        "Lojista Financeiro E2E",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantId = insertId(merchantResult);

    const [adminResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        adminOpenId,
        "Admin Financeiro E2E",
        `${adminOpenId}@example.test`,
        "e2e",
        "admin",
      ],
    );
    adminId = insertId(adminResult);

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, phone, address, pixKey, deliveryFee, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        `Loja Financeira ${runId}`,
        "11999990000",
        "Rua Financeira, 100",
        `pix-finance-${runId}`,
        "0.00",
        1,
      ],
    );
    storeId = insertId(storeResult);

    const [orderResult] = await connection.execute(
      "INSERT INTO pediu_orders (customerId, storeId, status, total, discount, deliveryAddress, idempotencyKey) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        customerId,
        storeId,
        "Entregue",
        "25.00",
        "0.00",
        "Rua Financeira, 100",
        `ci-finance-order-${runId}`,
      ],
    );
    orderId = insertId(orderResult);
    providerTransactionId = String(orderId);
    assert.ok(providerTransactionId);

    const [paymentResult] = await connection.execute(
      "INSERT INTO pediu_payments (orderId, method, status, transactionId) VALUES (?, ?, ?, ?)",
      [orderId, "pix", "pending", providerTransactionId],
    );
    paymentId = insertId(paymentResult);

    const [transactionResult] = await connection.execute(
      "INSERT INTO pediu_payment_transactions (paymentId, provider, providerTransactionId, status, amount, currency, idempotencyKey, externalReference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        paymentId,
        "mercado_pago",
        providerTransactionId,
        "pending",
        "25.00",
        "BRL",
        `ci-finance-transaction-${runId}`,
        `pediu-order-${orderId}`,
      ],
    );
    transactionRowId = insertId(transactionResult);

    const adminToken = await sdk.createSessionToken(adminOpenId, {
      name: "Admin Financeiro E2E",
      expiresInMs: 15 * 60_000,
    });

    const mercadoPagoApiBase = process.env.MERCADO_PAGO_API_BASE_URL?.trim();
    const mercadoPagoAccessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    if (!mercadoPagoApiBase || !mercadoPagoAccessToken || !webhookSecret) {
      throw new Error(
        "MERCADO_PAGO_API_BASE_URL, MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_WEBHOOK_SECRET são obrigatórios no smoke financeiro.",
      );
    }
    const providerChargeResponse = await fetch(
      `${mercadoPagoApiBase}/v1/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `ci-finance-charge-${runId}`,
        },
        body: JSON.stringify({
          transaction_amount: 25,
          payment_method_id: "pix",
          payer: { email: `${customerOpenId}@example.test` },
          external_reference: `pediu-order-${orderId}`,
        }),
      },
    );
    assert.equal(providerChargeResponse.status, 201);

    const webhookRequestId = `ci-finance-webhook-${runId}`;
    const webhookTimestamp = String(Math.floor(Date.now() / 1000));
    const webhookManifest = `id:${providerTransactionId.toLowerCase()};request-id:${webhookRequestId};ts:${webhookTimestamp};`;
    const webhookSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(webhookManifest, "utf8")
      .digest("hex");
    const webhookResponse = await fetch(
      `${apiBaseUrl}/api/webhooks/payments?data.id=${providerTransactionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": webhookRequestId,
          "x-signature": `ts=${webhookTimestamp},v1=${webhookSignature}`,
        },
        body: JSON.stringify({
          action: "payment.updated",
          type: "payment",
          data: { id: providerTransactionId },
        }),
      },
    );
    const webhookPayload = await webhookResponse.json().catch(() => ({}));
    assert.equal(webhookResponse.status, 200, JSON.stringify(webhookPayload));
    assert.equal(webhookPayload.status, "paid");

    const refundInput = {
      paymentId,
      amount: "25.00",
      idempotencyKey: refundKey,
      reason: "Smoke de refund idempotente",
    };
    const refunds = await Promise.all([
      callTrpc<{
        id: number;
        status: string;
        provider: string;
        providerRefundId?: string | null;
      }>("admin.refund", refundInput, adminToken),
      callTrpc<{
        id: number;
        status: string;
        provider: string;
        providerRefundId?: string | null;
      }>("admin.refund", refundInput, adminToken),
    ]);
    assert.equal(refunds[0]?.id, refunds[1]?.id);
    assert.ok(refunds.every((refund) => refund.provider === "mercado_pago"));
    assert.ok(refunds.every((refund) => refund.status === "refunded"));
    assert.ok(
      refunds.every((refund) => refund.providerRefundId),
      "refund must persist the provider refund id",
    );

    const [refundRows] = await connection.execute(
      "SELECT id, status, providerRefundId FROM pediu_refunds WHERE paymentId = ? AND provider = ? AND idempotencyKey = ?",
      [paymentId, "mercado_pago", refundKey],
    );
    assert.deepEqual(refundRows, [
      {
        id: refunds[0]!.id,
        status: "refunded",
        providerRefundId: refunds[0]!.providerRefundId,
      },
    ]);
    await assert.rejects(
      () =>
        callTrpc(
          "admin.refund",
          {
            ...refundInput,
            amount: "0.01",
            idempotencyKey: `${refundKey}-oversubscription`,
          },
          adminToken,
        ),
      /Refund excede o valor ainda disponível/,
    );

    const periodStart = new Date(Date.now() - 5 * 60_000).toISOString();
    const periodEnd = new Date(Date.now() + 5 * 60_000).toISOString();
    const reconciliationInput = {
      provider: "mercado_pago",
      idempotencyKey: reconciliationKey,
      periodStart,
      periodEnd,
      records: [
        {
          providerTransactionId,
          status: "approved",
          amount: "25.00",
          currency: "BRL",
        },
        {
          providerTransactionId: `unknown-${runId}`,
          status: "approved",
          amount: "9.00",
          currency: "BRL",
        },
      ],
    };
    const reconciliation = await callTrpc<{
      id: number;
      status: string;
      matchedCount: number;
      mismatchCount: number;
      items: Array<{ classification: string; providerTransactionId: string }>;
    }>("admin.reconcilePayments", reconciliationInput, adminToken);
    const reconciliationRetry = await callTrpc<typeof reconciliation>(
      "admin.reconcilePayments",
      reconciliationInput,
      adminToken,
    );
    assert.equal(reconciliation.status, "completed");
    assert.equal(reconciliation.matchedCount, 1);
    assert.equal(reconciliation.mismatchCount, 1);
    assert.equal(reconciliation.items.length, 2);
    assert.ok(
      reconciliation.items.some(
        (item) =>
          item.classification === "matched" &&
          item.providerTransactionId === providerTransactionId,
      ),
    );
    assert.ok(
      reconciliation.items.some(
        (item) =>
          item.classification === "missing_internal" &&
          item.providerTransactionId === `unknown-${runId}`,
      ),
    );
    assert.equal(reconciliationRetry.id, reconciliation.id);
    assert.deepEqual(reconciliationRetry.items, reconciliation.items);

    const [ledgerRows] = await connection.execute(
      "SELECT type, direction, amount, referenceId FROM pediu_financial_ledger WHERE paymentId = ? ORDER BY id",
      [paymentId],
    );
    assert.deepEqual(ledgerRows, [
      {
        type: "sale",
        direction: "credit",
        amount: "25.00",
        referenceId: `payment:${paymentId}:sale`,
      },
    ]);

    console.log(
      "Go-Live finance smoke passed: Mercado Pago refund idempotency, bounded reconciliation (1 matched + 1 missing_internal), and paid sale ledger persisted.",
    );
  } finally {
    try {
      if (transactionRowId) {
        await connection.execute(
          "DELETE FROM pediu_payment_transactions WHERE id = ?",
          [transactionRowId],
        );
      }
      if (paymentId) {
        await connection.execute(
          "DELETE FROM pediu_refunds WHERE paymentId = ?",
          [paymentId],
        );
        await connection.execute(
          "DELETE FROM pediu_commission_entries WHERE paymentId = ?",
          [paymentId],
        );
        await connection.execute(
          "DELETE FROM pediu_financial_ledger WHERE paymentId = ?",
          [paymentId],
        );
        await connection.execute("DELETE FROM pediu_payments WHERE id = ?", [
          paymentId,
        ]);
      }
      if (orderId) {
        await connection.execute(
          "DELETE FROM pediu_payment_reconciliation_items WHERE orderId = ?",
          [orderId],
        );
        await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
          orderId,
        ]);
      }
      await connection.execute(
        "DELETE FROM pediu_payment_reconciliation_items WHERE runId IN (SELECT id FROM pediu_payment_reconciliation_runs WHERE idempotencyKey = ?)",
        [reconciliationKey],
      );
      await connection.execute(
        "DELETE FROM pediu_payment_reconciliation_runs WHERE provider = ? AND idempotencyKey = ?",
        ["mercado_pago", reconciliationKey],
      );
      if (storeId) {
        await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
          storeId,
        ]);
      }
      if (adminId) {
        await connection.execute(
          "DELETE FROM pediu_admin_audit_logs WHERE actorId = ?",
          [adminId],
        );
      }
      for (const userId of [customerId, merchantId, adminId]) {
        if (userId)
          await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
      }
    } finally {
      await connection.end();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
