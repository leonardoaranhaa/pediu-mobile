import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for reviews smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for reviews smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for reviews smoke.");

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
  method: "GET" | "POST" = "POST",
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
  const customerOpenId = `ci-review-customer-${runId}`;
  const merchantOpenId = `ci-review-merchant-${runId}`;
  const courierOpenId = `ci-review-courier-${runId}`;
  const orderKey = `ci-review-order-${runId}`;
  const storeName = `Loja Reviews ${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let courierId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let otherProductId: number | undefined;
  let orderId: number | undefined;

  const insertId = (result: any) => {
    const id = Number(result.insertId);
    assert.ok(
      Number.isInteger(id) && id > 0,
      "review fixture insert did not return an id",
    );
    return id;
  };

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Reviews E2E",
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
        "Lojista Reviews E2E",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantId = insertId(merchantResult);

    const [courierResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        courierOpenId,
        "Courier Reviews E2E",
        `${courierOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    courierId = insertId(courierResult);

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, phone, address, pixKey, deliveryFee, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        storeName,
        "11999990000",
        "Rua Reviews, 10",
        `pix-review-${runId}`,
        "4.50",
        1,
      ],
    );
    storeId = insertId(storeResult);

    const [productResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Avaliável ${runId}`,
        "Lanches",
        "Produto incluído no pedido do smoke",
        "15.00",
        1,
      ],
    );
    productId = insertId(productResult);

    const [otherProductResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Fora do Pedido ${runId}`,
        "Lanches",
        "Produto deliberadamente fora do pedido",
        "18.00",
        1,
      ],
    );
    otherProductId = insertId(otherProductResult);

    const [orderResult] = await connection.execute(
      "INSERT INTO pediu_orders (customerId, storeId, status, total, deliveryAddress, idempotencyKey) VALUES (?, ?, ?, ?, ?, ?)",
      [customerId, storeId, "Entregue", "19.50", "Rua Reviews, 10", orderKey],
    );
    orderId = insertId(orderResult);

    await connection.execute(
      "INSERT INTO pediu_order_items (orderId, productId, quantity, unitPrice) VALUES (?, ?, ?, ?)",
      [orderId, productId, 1, "15.00"],
    );
    await connection.execute(
      "INSERT INTO pediu_delivery_assignments (orderId, courierId, courierName, courierPhone, status) VALUES (?, ?, ?, ?, ?)",
      [orderId, courierId, "Courier Reviews E2E", "11988887777", "delivered"],
    );

    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Reviews E2E",
      expiresInMs: 15 * 60_000,
    });

    const listedProducts = await callTrpc<number[]>(
      "pediu.experience.reviews.products",
      { orderId },
      customerToken,
      "GET",
    );
    assert.deepEqual(listedProducts, [productId]);

    const storeReview = await callTrpc<{
      reviewId: number;
      duplicate: boolean;
    }>(
      "pediu.experience.reviews.create",
      {
        orderId,
        target: "store",
        rating: 5,
        comment: "Atendimento excelente",
        idempotencyKey: `ci-review-store-${runId}`,
      },
      customerToken,
    );
    assert.equal(storeReview.duplicate, false);

    const productReview = await callTrpc<{
      reviewId: number;
      duplicate: boolean;
    }>(
      "pediu.experience.reviews.create",
      {
        orderId,
        target: "product",
        productId,
        rating: 4,
        idempotencyKey: `ci-review-product-${runId}`,
      },
      customerToken,
    );
    assert.equal(productReview.duplicate, false);

    const courierReview = await callTrpc<{
      reviewId: number;
      duplicate: boolean;
    }>(
      "pediu.experience.reviews.create",
      {
        orderId,
        target: "courier",
        rating: 5,
        idempotencyKey: `ci-review-courier-${runId}`,
      },
      customerToken,
    );
    assert.equal(courierReview.duplicate, false);

    const replay = await callTrpc<{
      success: true;
      reviewId: number;
      duplicate: boolean;
    }>(
      "pediu.experience.reviews.create",
      {
        orderId,
        target: "store",
        rating: 5,
        comment: "Atendimento excelente",
        idempotencyKey: `ci-review-store-${runId}`,
      },
      customerToken,
    );
    assert.deepEqual(replay, {
      success: true,
      reviewId: storeReview.reviewId,
      duplicate: true,
    });

    await assert.rejects(
      () =>
        callTrpc(
          "pediu.experience.reviews.create",
          {
            orderId,
            target: "store",
            rating: 3,
            comment: "Outra avaliação",
            idempotencyKey: `ci-review-store-${runId}`,
          },
          customerToken,
        ),
      /idempotência/,
    );

    await assert.rejects(
      () =>
        callTrpc(
          "pediu.experience.reviews.create",
          {
            orderId,
            target: "product",
            productId: otherProductId,
            rating: 5,
            idempotencyKey: `ci-review-outside-${runId}`,
          },
          customerToken,
        ),
      /não pertence/,
    );

    const [reviewRows] = await connection.execute(
      "SELECT target, productId FROM pediu_order_reviews WHERE orderId = ? ORDER BY target, id",
      [orderId],
    );
    assert.deepEqual(reviewRows, [
      { target: "courier", productId: null },
      { target: "product", productId },
      { target: "store", productId: null },
    ]);

    console.log(
      "Go-Live reviews smoke passed: product ownership, assigned courier, valid replay and conflicting replay are enforced against MariaDB.",
    );
  } finally {
    if (orderId) {
      await connection.execute(
        "DELETE FROM pediu_order_reviews WHERE orderId = ?",
        [orderId],
      );
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        orderId,
      ]);
    }
    if (otherProductId)
      await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
        otherProductId,
      ]);
    if (productId)
      await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
        productId,
      ]);
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    const ids = [customerId, merchantId, courierId].filter((id): id is number =>
      Boolean(id),
    );
    if (ids.length) {
      await connection.query(
        `DELETE FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );
    }
    await connection.end();
  }
}

void main().catch((error) => {
  console.error(
    `Go-Live reviews smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
