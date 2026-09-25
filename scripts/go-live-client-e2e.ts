import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for the Go-Live client E2E smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for the Go-Live client E2E smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for the Go-Live client E2E smoke.");

function unwrapTrpcData(body: any) {
  if (body?.error) {
    const message =
      body.error?.json?.message ?? body.error?.message ?? "tRPC request failed";
    throw new Error(message);
  }
  return body?.result?.data?.json ?? body?.result?.data;
}

async function callTrpc<T>(
  path: string,
  input: unknown,
  token: string,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const url =
    method === "GET"
      ? `${apiBaseUrl}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
      : `${apiBaseUrl}/api/trpc/${path}`;
  const response = await fetch(url, {
    method,
    headers,
    ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.error?.json?.message ??
      body?.error?.message ??
      `HTTP ${response.status}`;
    throw new Error(`${path}: ${message}`);
  }
  return unwrapTrpcData(body) as T;
}

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(
    Number.isInteger(id) && id > 0,
    "Fixture insert did not return an id",
  );
  return id;
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-e2e-customer-${runId}`;
  const merchantOpenId = `ci-e2e-merchant-${runId}`;
  const idempotencyKey = `ci-e2e-order-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let addressId: number | undefined;
  let orderId: number | undefined;

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente E2E Go-Live",
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
        "Lojista E2E Go-Live",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantId = insertId(merchantResult);

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, phone, address, pixKey, deliveryFee, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        `Loja E2E ${runId}`,
        "11999990000",
        "Rua E2E, 100",
        `pix-${runId}`,
        "4.50",
        1,
      ],
    );
    storeId = insertId(storeResult);

    const [productResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto E2E ${runId}`,
        "Doces",
        "Produto criado pelo smoke do Go-Live",
        "12.50",
        1,
      ],
    );
    productId = insertId(productResult);

    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente E2E Go-Live",
      expiresInMs: 15 * 60_000,
    });
    const merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista E2E Go-Live",
      expiresInMs: 15 * 60_000,
    });

    const catalog = await callTrpc<{
      items: Array<{ id: number; storeId: number; name: string }>;
      hasMore: boolean;
    }>(
      "pediu.marketplace.search",
      {
        query: `Produto E2E ${runId}`,
        category: "Doces",
        limit: 10,
        offset: 0,
      },
      customerToken,
    );
    assert.equal(
      catalog.items.length,
      1,
      "Catalog should return exactly the fixture product",
    );
    assert.equal(catalog.items[0].id, productId);
    assert.equal(catalog.items[0].storeId, storeId);

    addressId = await callTrpc<number>(
      "pediu.addresses.create",
      {
        label: "Casa E2E",
        recipientName: "Cliente E2E Go-Live",
        street: "Rua do Teste",
        number: "123",
        complement: "Apto 4",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        postalCode: "01311000",
        latitude: "-23.5616847",
        longitude: "-46.6561393",
        isDefault: true,
      },
      customerToken,
      "POST",
    );
    assert.ok(addressId > 0);

    const addresses = await callTrpc<
      Array<{
        id: number;
        latitude: string | null;
        longitude: string | null;
        isDefault: number;
      }>
    >("pediu.addresses.list", undefined, customerToken);
    const persistedAddress = addresses.find(
      (address) => address.id === addressId,
    );
    assert.ok(
      persistedAddress,
      "Created address should be visible to its owner",
    );
    assert.equal(String(persistedAddress.latitude), "-23.5616847");
    assert.equal(String(persistedAddress.longitude), "-46.6561393");
    assert.equal(persistedAddress.isDefault, 1);

    const quote = await callTrpc<{
      storeId: number;
      subtotal: string;
      deliveryFee: string;
      total: string;
      items: Array<{
        productId: number;
        unitPrice: string;
        quantity: number;
        lineTotal: string;
      }>;
    }>(
      "pediu.checkout.quote",
      { storeId, items: [{ productId, quantity: 1 }] },
      customerToken,
    );
    assert.deepEqual(
      {
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        total: quote.total,
      },
      { subtotal: "12.50", deliveryFee: "4.50", total: "17.00" },
    );
    assert.deepEqual(
      {
        productId: quote.items[0].productId,
        quantity: quote.items[0].quantity,
        unitPrice: quote.items[0].unitPrice,
        lineTotal: quote.items[0].lineTotal,
      },
      { productId, quantity: 1, unitPrice: "12.50", lineTotal: "12.50" },
    );

    const created = await callTrpc<{
      orderId: number;
      paymentId: number;
      status: string;
    }>(
      "pediu.orders.create",
      {
        idempotencyKey,
        storeId,
        total: quote.total,
        paymentMethod: "pix",
        addressId,
        items: [
          { productId, quantity: 1, unitPrice: quote.items[0].unitPrice },
        ],
      },
      customerToken,
      "POST",
    );
    orderId = created.orderId;
    assert.equal(created.status, "Pendente");
    assert.ok(created.paymentId > 0);

    const payment = await callTrpc<{
      id: number;
      orderId: number;
      method: string;
      status: string;
    }>("pediu.payments.get", { paymentId: created.paymentId }, customerToken);
    assert.deepEqual(
      {
        id: payment.id,
        orderId: payment.orderId,
        method: payment.method,
        status: payment.status,
      },
      {
        id: created.paymentId,
        orderId,
        method: "pix",
        status: "pending",
      },
    );

    const pix = await callTrpc<{
      paymentId: number;
      status: string;
      provider: string;
    }>("pediu.payments.createPix", { orderId }, customerToken, "POST");
    assert.deepEqual(
      { paymentId: pix.paymentId, status: pix.status, provider: pix.provider },
      {
        paymentId: created.paymentId,
        status: "pending",
        provider: "persisted",
      },
    );

    const retried = await callTrpc<{
      orderId: number;
      paymentId: number;
      status: string;
    }>(
      "pediu.orders.create",
      {
        idempotencyKey,
        storeId,
        total: quote.total,
        paymentMethod: "pix",
        addressId,
        items: [{ productId, quantity: 1, unitPrice: "999.99" }],
      },
      customerToken,
      "POST",
    );
    assert.deepEqual(retried, {
      orderId,
      paymentId: created.paymentId,
      status: "Pendente",
    });

    const [orderRows] = await connection.execute(
      "SELECT id, total, status, deliveryAddress FROM pediu_orders WHERE idempotencyKey = ?",
      [idempotencyKey],
    );
    assert.equal(
      (orderRows as Array<any>).length,
      1,
      "Idempotent retry must keep one order",
    );
    assert.deepEqual((orderRows as Array<any>)[0], {
      id: orderId,
      total: "17.00",
      status: "Pendente",
      deliveryAddress:
        "Rua do Teste, 123, Apto 4, Centro · São Paulo/SP, 01311000",
    });

    const [paymentRows] = await connection.execute(
      "SELECT id, orderId, status FROM pediu_payments WHERE orderId = ?",
      [orderId],
    );
    assert.equal(
      (paymentRows as Array<any>).length,
      1,
      "Idempotent retry must keep one payment",
    );
    assert.equal((paymentRows as Array<any>)[0].status, "pending");

    const storeOrders = await callTrpc<
      Array<{ id: number; status: string; total: string }>
    >("pediu.orders.storeMine", { limit: 20, offset: 0 }, merchantToken);
    assert.equal(storeOrders.filter((order) => order.id === orderId).length, 1);

    for (const status of ["Aceito", "Preparando", "Pronto"] as const) {
      const transitionResult: { success: true } = await callTrpc<{
        success: true;
      }>("pediu.orders.status", { orderId, status }, merchantToken, "POST");
      assert.deepEqual(transitionResult, { success: true });
    }

    const finalOrder = await callTrpc<{
      id: number;
      status: string;
      total: string;
      deliveryAddress: string | null;
    }>("pediu.orders.get", { orderId }, customerToken);
    assert.deepEqual(
      {
        id: finalOrder.id,
        status: finalOrder.status,
        total: finalOrder.total,
        deliveryAddress: finalOrder.deliveryAddress,
      },
      {
        id: orderId,
        status: "Pronto",
        total: "17.00",
        deliveryAddress:
          "Rua do Teste, 123, Apto 4, Centro · São Paulo/SP, 01311000",
      },
    );

    const [eventRows] = await connection.execute(
      "SELECT eventType FROM pediu_delivery_events WHERE orderId = ? ORDER BY id",
      [orderId],
    );
    assert.deepEqual(
      (eventRows as Array<{ eventType: string }>).map(
        (event) => event.eventType,
      ),
      ["Pendente", "Aceito", "Preparando", "Pronto"],
    );

    console.log(
      "Go-Live client E2E smoke passed: catalog, address, quote, pending PIX, idempotent order retry and merchant status flow.",
    );
  } finally {
    if (orderId) {
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        orderId,
      ]);
    }
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
    if (customerId || merchantId) {
      const ids = [customerId, merchantId].filter((id): id is number =>
        Boolean(id),
      );
      if (ids.length)
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
    `Go-Live client E2E smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
