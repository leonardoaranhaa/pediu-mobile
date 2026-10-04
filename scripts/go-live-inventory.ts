import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const concurrency = Math.min(
  Math.max(Number(process.env.INVENTORY_CONCURRENCY ?? 12), 2),
  32,
);
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for inventory smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for inventory smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for inventory smoke.");

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
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const url =
    method === "GET"
      ? `${apiBaseUrl}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
      : `${apiBaseUrl}/api/trpc/${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      `${path}: HTTP ${response.status} ${body?.error?.json?.message ?? body?.error?.message ?? "unknown"}`,
    );
  return unwrap<T>(body);
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
  const customerOpenId = `ci-inventory-customer-${runId}`;
  const merchantOpenId = `ci-inventory-merchant-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let addressId: number | undefined;
  const orderIds: number[] = [];

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Inventário E2E",
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
        "Lojista Inventário E2E",
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
        `Loja Inventário ${runId}`,
        "11999990000",
        "Rua do Estoque, 10",
        `pix-inventory-${runId}`,
        "0.00",
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
      "INSERT INTO pediu_products (storeId, name, category, description, price, available, inventoryTracked, stockQuantity, reservedQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Inventário ${runId}`,
        "Lanches",
        "Fixture de overselling",
        "10.00",
        1,
        1,
        1,
        0,
      ],
    );
    productId = insertId(productResult);

    const { sdk } = await import("../server/_core/sdk");
    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Inventário E2E",
      expiresInMs: 15 * 60_000,
    });
    addressId = await callTrpc<number>(
      "pediu.addresses.create",
      {
        label: "Casa Inventário",
        recipientName: "Cliente Inventário E2E",
        street: "Rua do Estoque",
        number: "45",
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
      "POST",
    );
    const quote = await callTrpc<{ total: string }>(
      "pediu.checkout.quote",
      { storeId, addressId, items: [{ productId, quantity: 1 }] },
      customerToken,
    );
    assert.equal(quote.total, "10.00");

    const attempts = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, index) =>
        callTrpc<{ orderId: number; status: string }>(
          "pediu.orders.create",
          {
            idempotencyKey: `ci-inventory-${runId}-${index}`,
            storeId,
            total: quote.total,
            paymentMethod: "cash",
            addressId,
            items: [{ productId, quantity: 1, unitPrice: "10.00" }],
          },
          customerToken,
          "POST",
        ),
      ),
    );
    const fulfilled = attempts.filter(
      (
        attempt,
      ): attempt is PromiseFulfilledResult<{
        orderId: number;
        status: string;
      }> => attempt.status === "fulfilled",
    );
    const rejected = attempts.filter(
      (attempt) => attempt.status === "rejected",
    );
    assert.equal(
      fulfilled.length,
      1,
      "exactly one concurrent order must reserve stock",
    );
    assert.equal(
      rejected.length,
      concurrency - 1,
      "all other concurrent orders must be rejected",
    );
    assert.match(
      String((rejected[0] as PromiseRejectedResult).reason?.message),
      /Estoque insuficiente/,
    );
    orderIds.push(fulfilled[0].value.orderId);

    const [reservedRows] = await connection.execute(
      "SELECT inventoryTracked, stockQuantity, reservedQuantity FROM pediu_products WHERE id = ?",
      [productId],
    );
    assert.deepEqual(reservedRows, [
      { inventoryTracked: 1, stockQuantity: 1, reservedQuantity: 1 },
    ]);

    await callTrpc(
      "pediu.orders.status",
      { orderId: orderIds[0], status: "Cancelado" },
      customerToken,
      "POST",
    );
    const [releasedRows] = await connection.execute(
      "SELECT stockQuantity, reservedQuantity FROM pediu_products WHERE id = ?",
      [productId],
    );
    assert.deepEqual(releasedRows, [{ stockQuantity: 1, reservedQuantity: 0 }]);

    console.log(
      "Go-Live inventory smoke passed: one concurrent reservation won, overselling was rejected, and cancellation released the reservation.",
    );
  } finally {
    const cleanupOrderIds = new Set(orderIds);
    const [fixtureOrders] = await connection.execute(
      "SELECT id FROM pediu_orders WHERE idempotencyKey LIKE ?",
      [`ci-inventory-${runId}-%`],
    );
    for (const row of fixtureOrders as Array<{ id: number | string }>)
      cleanupOrderIds.add(Number(row.id));
    const orderIdsToDelete = [...cleanupOrderIds];
    if (orderIdsToDelete.length) {
      const placeholders = orderIdsToDelete.map(() => "?").join(",");
      if (productId)
        await connection.execute(
          "UPDATE pediu_products SET reservedQuantity = GREATEST(0, reservedQuantity - ?) WHERE id = ?",
          [orderIds.length, productId],
        );
      await connection.query(
        `DELETE FROM pediu_delivery_events WHERE orderId IN (${placeholders})`,
        orderIdsToDelete,
      );
      await connection.query(
        `DELETE FROM pediu_payments WHERE orderId IN (${placeholders})`,
        orderIdsToDelete,
      );
      await connection.query(
        `DELETE FROM pediu_order_items WHERE orderId IN (${placeholders})`,
        orderIdsToDelete,
      );
      await connection.query(
        `DELETE FROM pediu_orders WHERE id IN (${placeholders})`,
        orderIdsToDelete,
      );
    }
    if (addressId)
      await connection.execute(
        "DELETE FROM pediu_customer_addresses WHERE id = ?",
        [addressId],
      );
    if (productId)
      await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
        productId,
      ]);
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    const ids = [customerId, merchantId].filter((id): id is number =>
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `Go-Live inventory smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exit(1);
  });
