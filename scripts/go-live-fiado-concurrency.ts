import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for the fiado concurrency smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for the fiado concurrency smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for the fiado concurrency smoke.");

function unwrap<T>(body: any): T {
  if (body?.error)
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? "tRPC request failed",
    );
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
  if (!response.ok)
    throw new Error(
      `${path}: HTTP ${response.status} ${body?.error?.json?.message ?? body?.error?.message ?? "unknown"}`,
    );
  return unwrap<T>(body);
}

async function attemptTrpc<T>(
  path: string,
  input: unknown,
  token: string,
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await callTrpc<T>(path, input, token) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(
    Number.isInteger(id) && id > 0,
    "fixture insert did not return an id",
  );
  return id;
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-fiado-customer-${runId}`;
  const merchantOpenId = `ci-fiado-merchant-${runId}`;
  const orderKey = `ci-fiado-order-${runId}`;
  const total = "30.00";
  let customerUserId: number | undefined;
  let merchantUserId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let customerId: number | undefined;
  let orderId: number | undefined;

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Fiado Concorrente",
        `${customerOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    customerUserId = insertId(customerResult);
    const [merchantResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        merchantOpenId,
        "Lojista Fiado Concorrente",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantUserId = insertId(merchantResult);
    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, phone, address, pixKey, deliveryFee, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        merchantUserId,
        `Loja Fiado ${runId}`,
        "11999990000",
        "Rua do Fiado, 10",
        `pix-fiado-${runId}`,
        "0.00",
        1,
      ],
    );
    storeId = insertId(storeResult);
    const [productResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Fiado ${runId}`,
        "Lanches",
        "Fixture de concorrência fiado",
        total,
        1,
      ],
    );
    productId = insertId(productResult);
    const [customerResult2] = await connection.execute(
      "INSERT INTO pediu_customers (storeId, userId, name, creditLimit, balance, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        customerUserId,
        "Cliente Fiado Concorrente",
        "50.00",
        "0.00",
        "active",
      ],
    );
    customerId = insertId(customerResult2);

    const { sdk } = await import("../server/_core/sdk");
    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Fiado Concorrente",
      expiresInMs: 15 * 60_000,
    });
    const input = {
      idempotencyKey: orderKey,
      storeId,
      total,
      paymentMethod: "fiado" as const,
      deliveryAddress: "Rua do Fiado, 10",
      items: [{ productId, quantity: 1, unitPrice: total }],
    };
    const results = await Promise.all([
      callTrpc<{
        orderId: number;
        paymentId: number | null;
        status: string;
      }>("pediu.orders.create", input, customerToken),
      callTrpc<{
        orderId: number;
        paymentId: number | null;
        status: string;
      }>("pediu.orders.create", input, customerToken),
    ]);

    assert.equal(results.length, 2);
    assert.equal(results[0].orderId, results[1].orderId);
    assert.equal(results[0].paymentId, null);
    assert.equal(results[1].paymentId, null);
    assert.equal(results[0].status, "Pendente");
    assert.equal(results[1].status, "Pendente");
    orderId = results[0].orderId;

    const [orderRows] = await connection.execute(
      "SELECT id, total FROM pediu_orders WHERE idempotencyKey = ?",
      [orderKey],
    );
    assert.equal((orderRows as Array<{ id: number }>).length, 1);
    const [itemRows] = await connection.execute(
      "SELECT id FROM pediu_order_items WHERE orderId = ?",
      [orderId],
    );
    assert.equal((itemRows as Array<{ id: number }>).length, 1);
    const [paymentRows] = await connection.execute(
      "SELECT id, status FROM pediu_payments WHERE orderId = ? AND method = 'fiado'",
      [orderId],
    );
    assert.equal((paymentRows as Array<{ id: number }>).length, 1);
    assert.equal((paymentRows as Array<{ status: string }>)[0]?.status, "paid");
    const [customerRows] = await connection.execute(
      "SELECT balance FROM pediu_customers WHERE id = ?",
      [customerId],
    );
    assert.equal(
      (customerRows as Array<{ balance: string }>)[0]?.balance,
      total,
    );
    const [ledgerRows] = await connection.execute(
      "SELECT orderId, type, amount, balanceAfter FROM pediu_ledger_entries WHERE orderId = ?",
      [orderId],
    );
    assert.deepEqual(ledgerRows, [
      { orderId, type: "credit", amount: total, balanceAfter: total },
    ]);

    await connection.execute(
      "DELETE FROM pediu_ledger_entries WHERE orderId = ?",
      [orderId],
    );
    await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
      orderId,
    ]);
    orderId = undefined;
    await connection.execute(
      "UPDATE pediu_customers SET balance = '0.00' WHERE id = ?",
      [customerId],
    );

    const differentKeyResults = await Promise.all(
      ["a", "b"].map((suffix) =>
        attemptTrpc<{
          orderId: number;
          paymentId: number | null;
          status: string;
        }>(
          "pediu.orders.create",
          { ...input, idempotencyKey: `ci-fiado-order-${suffix}-${runId}` },
          customerToken,
        ),
      ),
    );
    const successfulDifferentKeys = differentKeyResults.filter(
      (
        result,
      ): result is {
        ok: true;
        value: { orderId: number; paymentId: number | null; status: string };
      } => result.ok,
    );
    const rejectedDifferentKeys = differentKeyResults.filter(
      (result): result is { ok: false; message: string } => !result.ok,
    );
    assert.equal(successfulDifferentKeys.length, 1);
    assert.equal(rejectedDifferentKeys.length, 1);
    assert.match(
      rejectedDifferentKeys[0].message,
      /Limite de fiado insuficiente/,
    );
    assert.equal(successfulDifferentKeys[0].value.paymentId, null);
    assert.equal(successfulDifferentKeys[0].value.status, "Pendente");
    orderId = successfulDifferentKeys[0].value.orderId;

    const [oversubscriptionBalanceRows] = await connection.execute(
      "SELECT balance FROM pediu_customers WHERE id = ?",
      [customerId],
    );
    assert.equal(
      (oversubscriptionBalanceRows as Array<{ balance: string }>)[0]?.balance,
      total,
    );

    console.log(
      "Go-Live fiado concurrency smoke passed: same-key retries collapsed to one credit and different-key oversubscription was rejected without a lost balance update.",
    );
  } finally {
    if (!orderId) {
      const [orderRows] = await connection.execute(
        "SELECT id FROM pediu_orders WHERE idempotencyKey = ? LIMIT 1",
        [orderKey],
      );
      orderId = (orderRows as Array<{ id: number }>)[0]?.id;
    }
    if (orderId)
      await connection.execute(
        "DELETE FROM pediu_ledger_entries WHERE orderId = ?",
        [orderId],
      );
    if (orderId)
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        orderId,
      ]);
    if (customerId)
      await connection.execute("DELETE FROM pediu_customers WHERE id = ?", [
        customerId,
      ]);
    if (productId)
      await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
        productId,
      ]);
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    const ids = [customerUserId, merchantUserId].filter((id): id is number =>
      Boolean(id),
    );
    if (ids.length)
      await connection.query(
        `DELETE FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );
    await connection.end();
  }
}

void main().catch((error) => {
  console.error(
    `Go-Live fiado concurrency failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
