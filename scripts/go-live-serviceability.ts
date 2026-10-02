import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for serviceability smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for serviceability smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for serviceability smoke.");

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(Number.isInteger(id) && id > 0, "Fixture insert did not return id");
  return id;
}

function unwrap(body: any) {
  if (body?.error) {
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? "tRPC request failed",
    );
  }
  return body?.result?.data?.json ?? body?.result?.data;
}

async function callTrpc<T>(
  path: string,
  input: unknown,
  token: string,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const response = await fetch(
    method === "GET"
      ? `${apiBaseUrl}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
      : `${apiBaseUrl}/api/trpc/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${path}: ${body?.error?.json?.message ?? body?.error?.message ?? `HTTP ${response.status}`}`,
    );
  }
  return unwrap(body) as T;
}

async function expectFailure(action: () => Promise<unknown>, fragment: string) {
  try {
    await action();
    assert.fail(`Expected failure containing ${fragment}`);
  } catch (error) {
    assert.match(String(error), new RegExp(fragment, "i"));
  }
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-serviceability-customer-${runId}`;
  const merchantOpenId = `ci-serviceability-merchant-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let insideAddressId: number | undefined;
  let outsideAddressId: number | undefined;
  let pickupOrderId: number | undefined;

  try {
    customerId = insertId(
      (
        await connection.execute(
          "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
          [
            customerOpenId,
            "Cliente Serviceability E2E",
            `${customerOpenId}@example.test`,
            "e2e",
            "user",
          ],
        )
      )[0],
    );
    merchantId = insertId(
      (
        await connection.execute(
          "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
          [
            merchantOpenId,
            "Lojista Serviceability E2E",
            `${merchantOpenId}@example.test`,
            "e2e",
            "merchant",
          ],
        )
      )[0],
    );

    storeId = insertId(
      (
        await connection.execute(
          "INSERT INTO pediu_stores (ownerId, name, address, deliveryFee, deliveryEnabled, pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            merchantId,
            `Loja Serviceability ${runId}`,
            "Rua da Loja, 100",
            "7.50",
            1,
            1,
            "5.00",
            "-23.550520",
            "-46.633308",
            1,
          ],
        )
      )[0],
    );
    productId = insertId(
      (
        await connection.execute(
          "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
          [
            storeId,
            `Produto Serviceability ${runId}`,
            "Lanches",
            "Fixture isolada do smoke de cobertura",
            "12.50",
            1,
          ],
        )
      )[0],
    );

    const addressValues = [
      customerId,
      "Casa",
      "Cliente Serviceability",
      "Rua Dentro",
      "10",
      null,
      "Centro",
      "São Paulo",
      "SP",
      "01001000",
      "-23.551000",
      "-46.634000",
      1,
    ];
    insideAddressId = insertId(
      (
        await connection.execute(
          "INSERT INTO pediu_customer_addresses (userId, label, recipientName, street, number, complement, neighborhood, city, state, postalCode, latitude, longitude, isDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          addressValues,
        )
      )[0],
    );
    outsideAddressId = insertId(
      (
        await connection.execute(
          "INSERT INTO pediu_customer_addresses (userId, label, recipientName, street, number, complement, neighborhood, city, state, postalCode, latitude, longitude, isDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [...addressValues.slice(0, 10), "-23.600000", "-46.700000", 0],
        )
      )[0],
    );

    const token = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Serviceability E2E",
      expiresInMs: 15 * 60_000,
    });
    const quoteInput = {
      storeId,
      items: [{ productId, quantity: 1 }],
    };

    const deliveryQuote = await callTrpc<{
      fulfillmentMode: string;
      deliveryFee: string;
      distanceKm: string | null;
      total: string;
    }>(
      "pediu.checkout.quote",
      { ...quoteInput, addressId: insideAddressId },
      token,
    );
    assert.equal(deliveryQuote.fulfillmentMode, "delivery");
    assert.equal(deliveryQuote.deliveryFee, "7.50");
    assert.equal(deliveryQuote.total, "20.00");
    assert.ok(Number(deliveryQuote.distanceKm) < 5);

    await expectFailure(
      () =>
        callTrpc(
          "pediu.checkout.quote",
          {
            ...quoteInput,
            addressId: outsideAddressId,
          },
          token,
        ),
      "fora da área",
    );

    const pickupQuote = await callTrpc<{
      fulfillmentMode: string;
      deliveryFee: string;
      total: string;
    }>(
      "pediu.checkout.quote",
      { ...quoteInput, fulfillmentMode: "pickup" },
      token,
    );
    assert.deepEqual(
      {
        fulfillmentMode: pickupQuote.fulfillmentMode,
        deliveryFee: pickupQuote.deliveryFee,
        total: pickupQuote.total,
      },
      { fulfillmentMode: "pickup", deliveryFee: "0.00", total: "12.50" },
    );

    const created = await callTrpc<{ orderId: number; status: string }>(
      "pediu.orders.create",
      {
        idempotencyKey: `ci-serviceability-order-${runId}`,
        storeId,
        total: "12.50",
        paymentMethod: "cash",
        fulfillmentMode: "pickup",
        items: [{ productId, quantity: 1, unitPrice: "999.99" }],
      },
      token,
      "POST",
    );
    pickupOrderId = created.orderId;
    assert.equal(created.status, "Pendente");

    const [orderRows] = await connection.execute(
      "SELECT fulfillmentMode, deliveryFeeSnapshot, deliveryAddress FROM pediu_orders WHERE id = ? LIMIT 1",
      [pickupOrderId],
    );
    const order = (orderRows as Array<Record<string, unknown>>)[0];
    assert.equal(order?.fulfillmentMode, "pickup");
    assert.equal(String(order?.deliveryFeeSnapshot), "0.00");
    assert.match(String(order?.deliveryAddress), /Retirada em/);

    console.log(
      JSON.stringify({
        ok: true,
        deliveryInside: true,
        deliveryOutsideBlocked: true,
        pickupQuoted: true,
        pickupOrderId,
        distanceKm: deliveryQuote.distanceKm,
      }),
    );
  } finally {
    if (pickupOrderId) {
      await connection.execute("DELETE FROM pediu_payments WHERE orderId = ?", [
        pickupOrderId,
      ]);
      await connection.execute(
        "DELETE FROM pediu_order_items WHERE orderId = ?",
        [pickupOrderId],
      );
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        pickupOrderId,
      ]);
    }
    if (insideAddressId || outsideAddressId) {
      await connection.execute(
        "DELETE FROM pediu_customer_addresses WHERE id IN (?, ?)",
        [insideAddressId ?? 0, outsideAddressId ?? 0],
      );
    }
    if (productId)
      await connection.execute("DELETE FROM pediu_products WHERE id = ?", [
        productId,
      ]);
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    if (customerId || merchantId)
      await connection.execute("DELETE FROM users WHERE id IN (?, ?)", [
        customerId ?? 0,
        merchantId ?? 0,
      ]);
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    `[go-live:serviceability] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
