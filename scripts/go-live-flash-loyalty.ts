import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL é obrigatório para o smoke Flash/Club.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID é obrigatório para o smoke Flash/Club.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET é obrigatório para o smoke Flash/Club.");

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(
    Number.isInteger(id) && id > 0,
    "insert do fixture não retornou id",
  );
  return id;
}

function unwrap<T>(body: any): T {
  if (body?.error) {
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? "falha tRPC",
    );
  }
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

async function callTrpc<T>(
  path: string,
  input: unknown,
  token?: string,
  kind: "query" | "mutation" = "mutation",
): Promise<T> {
  const queryUrl = `${apiBaseUrl}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(
    kind === "query" ? queryUrl : `${apiBaseUrl}/api/trpc/${path}`,
    {
      method: kind === "query" ? "GET" : "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(kind === "mutation" ? { "Content-Type": "application/json" } : {}),
      },
      ...(kind === "mutation" ? { body: JSON.stringify({ json: input }) } : {}),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${path}: HTTP ${response.status} ${body?.error?.json?.message ?? body?.error?.message ?? "unknown"}`,
    );
  }
  return unwrap<T>(body);
}

async function expectRejected(
  action: () => Promise<unknown>,
  message?: RegExp,
): Promise<void> {
  if (!message) {
    await assert.rejects(action);
    return;
  }
  await assert.rejects(action, (error: unknown) =>
    message.test(error instanceof Error ? error.message : String(error)),
  );
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-flash-customer-${runId}`;
  const otherCustomerOpenId = `ci-flash-other-${runId}`;
  const merchantOpenId = `ci-flash-merchant-${runId}`;
  const idempotencyPrefix = `ci-flash-${runId}`;
  const orderIds: number[] = [];
  let customerId: number | undefined;
  let otherCustomerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let addressId: number | undefined;
  let customerToken = "";
  let otherCustomerToken = "";
  let merchantToken = "";

  const cleanup = async () => {
    try {
      if (orderIds.length) {
        const placeholders = orderIds.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM pediu_financial_ledger WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_tip_settlements WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_delivery_locations WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_delivery_events WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_delivery_assignments WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_delivery_offers WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_order_items WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_payments WHERE orderId IN (${placeholders})`,
          orderIds,
        );
        await connection.execute(
          `DELETE FROM pediu_orders WHERE id IN (${placeholders})`,
          orderIds,
        );
      }
      if (customerId || otherCustomerId) {
        const ids = [customerId, otherCustomerId].filter(
          (value): value is number => value !== undefined,
        );
        const placeholders = ids.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM pediu_loyalty_ledger WHERE userId IN (${placeholders})`,
          ids,
        );
        await connection.execute(
          `DELETE FROM pediu_loyalty_accounts WHERE userId IN (${placeholders})`,
          ids,
        );
        await connection.execute(
          `DELETE FROM pediu_coupons WHERE code LIKE ?`,
          [`CLUBE${customerId ?? 0}%`],
        );
        await connection.execute(
          `DELETE FROM pediu_customer_addresses WHERE userId IN (${placeholders})`,
          ids,
        );
      }
      if (productId) {
        await connection.execute(`DELETE FROM pediu_products WHERE id = ?`, [
          productId,
        ]);
      }
      if (storeId) {
        await connection.execute(`DELETE FROM pediu_stores WHERE id = ?`, [
          storeId,
        ]);
      }
      const userOpenIds = [customerOpenId, otherCustomerOpenId, merchantOpenId];
      await connection.execute(
        `DELETE FROM users WHERE openId IN (${userOpenIds.map(() => "?").join(",")})`,
        userOpenIds,
      );
    } finally {
      await connection.end();
    }
  };

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Flash E2E",
        `${customerOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    customerId = insertId(customerResult);
    const [otherCustomerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        otherCustomerOpenId,
        "Cliente Secundário Flash E2E",
        `${otherCustomerOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    otherCustomerId = insertId(otherCustomerResult);
    const [merchantResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        merchantOpenId,
        "Lojista Flash E2E",
        `${merchantOpenId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    merchantId = insertId(merchantResult);

    const [storeResult] = await connection.execute(
      `INSERT INTO pediu_stores
        (ownerId, name, phone, address, pixKey, deliveryFee, deliveryEnabled,
         pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen, kind,
         flashEnabled, flashEtaMaxMinutes, flashFeeOverride)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merchantId,
        `Mercado Flash ${runId}`,
        "11999990000",
        "Rua Flash, 100",
        `pix-flash-${runId}`,
        "8.00",
        1,
        1,
        "10.00",
        "-23.5505000",
        "-46.6333000",
        1,
        "market",
        1,
        25,
        "2.50",
      ],
    );
    storeId = insertId(storeResult);

    const [productResult] = await connection.execute(
      `INSERT INTO pediu_products
        (storeId, name, category, description, price, available, inventoryTracked, stockQuantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        "Cesta Flash E2E",
        "Mercado",
        "Fixture exclusivo do smoke vertical",
        "60.00",
        1,
        0,
        0,
      ],
    );
    productId = insertId(productResult);

    const [addressResult] = await connection.execute(
      `INSERT INTO pediu_customer_addresses
        (userId, label, recipientName, street, number, complement,
         neighborhood, city, state, postalCode, latitude, longitude, isDefault)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        "Casa",
        "Cliente Flash E2E",
        "Rua Flash",
        "100",
        null,
        "Centro",
        "São Paulo",
        "SP",
        "01000000",
        "-23.5505000",
        "-46.6333000",
        1,
      ],
    );
    addressId = insertId(addressResult);

    customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Flash E2E",
      expiresInMs: 15 * 60_000,
    });
    otherCustomerToken = await sdk.createSessionToken(otherCustomerOpenId, {
      name: "Cliente Secundário Flash E2E",
      expiresInMs: 15 * 60_000,
    });
    merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista Flash E2E",
      expiresInMs: 15 * 60_000,
    });

    const flashSearch = await callTrpc<any>(
      "pediu.marketplace.search",
      { flash: true, vertical: "market", limit: 10, offset: 0 },
      customerToken,
      "query",
    );
    assert.ok(
      flashSearch.items.some((item: any) => item.id === productId),
      "produto Flash não apareceu no filtro Flash + Mercado",
    );

    const taste = await callTrpc<any>(
      "pediu.marketplace.taste",
      { moodId: "party", limit: 10, offset: 0 },
      customerToken,
      "query",
    );
    assert.equal(taste.mood.id, "party");
    assert.equal(taste.mood.title, "Festa");

    const flashQuote = await callTrpc<any>(
      "pediu.checkout.quote",
      {
        storeId,
        addressId,
        fulfillmentMode: "delivery",
        fulfillment: "flash",
        tipAmount: 5,
        items: [{ productId, quantity: 2 }],
      },
      customerToken,
      "query",
    );
    assert.deepEqual(
      {
        subtotal: flashQuote.subtotal,
        deliveryFee: flashQuote.deliveryFee,
        tipAmount: flashQuote.tipAmount,
        total: flashQuote.total,
        isFlash: flashQuote.isFlash,
        fulfillment: flashQuote.fulfillment,
      },
      {
        subtotal: "120.00",
        deliveryFee: "2.50",
        tipAmount: "5.00",
        total: "127.50",
        isFlash: true,
        fulfillment: "flash",
      },
    );

    await connection.execute(
      "UPDATE pediu_stores SET flashEnabled = 0 WHERE id = ?",
      [storeId],
    );
    await expectRejected(
      () =>
        callTrpc(
          "pediu.checkout.quote",
          {
            storeId,
            addressId,
            fulfillmentMode: "delivery",
            fulfillment: "flash",
            items: [{ productId, quantity: 1 }],
          },
          customerToken,
          "query",
        ),
      /não oferece Pediu Flash/i,
    );
    await connection.execute(
      "UPDATE pediu_stores SET flashEnabled = 1 WHERE id = ?",
      [storeId],
    );
    await expectRejected(
      () =>
        callTrpc(
          "pediu.checkout.quote",
          {
            storeId,
            fulfillmentMode: "pickup",
            fulfillment: "flash",
            items: [{ productId, quantity: 1 }],
          },
          customerToken,
          "query",
        ),
      /Pediu Entregas/i,
    );

    const flashOrder = await callTrpc<any>(
      "pediu.orders.create",
      {
        idempotencyKey: `${idempotencyPrefix}-flash-order`,
        storeId,
        total: flashQuote.total,
        paymentMethod: "cash",
        fulfillmentMode: "delivery",
        fulfillment: "flash",
        tipAmount: 5,
        addressId,
        items: [{ productId, quantity: 2, unitPrice: "0.01" }],
      },
      customerToken,
    );
    assert.ok(flashOrder.orderId > 0);
    orderIds.push(flashOrder.orderId);

    const [flashSnapshotRows] = await connection.execute(
      `SELECT isFlash, tipAmount, tipDestination, fulfillment, fulfillmentMode, deliveryFeeSnapshot, total
       FROM pediu_orders WHERE id = ?`,
      [flashOrder.orderId],
    );
    assert.deepEqual((flashSnapshotRows as any[])[0], {
      isFlash: 1,
      tipAmount: "5.00",
      tipDestination: "courier",
      fulfillment: "flash",
      fulfillmentMode: "delivery",
      deliveryFeeSnapshot: "2.50",
      total: "127.50",
    });

    for (const status of ["Aceito", "Preparando", "Pronto"] as const) {
      await callTrpc(
        "pediu.orders.status",
        {
          orderId: flashOrder.orderId,
          status,
        },
        merchantToken,
      );
    }
    await callTrpc(
      "pediu.experience.delivery.assign",
      {
        orderId: flashOrder.orderId,
        courierName: "Courier E2E",
        etaMinutes: 12,
      },
      merchantToken,
    );
    await callTrpc(
      "pediu.experience.delivery.location",
      {
        orderId: flashOrder.orderId,
        latitude: -23.5505,
        longitude: -46.6333,
        etaMinutes: 5,
        idempotencyKey: `${idempotencyPrefix}-flash-location`,
      },
      merchantToken,
    );
    await callTrpc(
      "pediu.experience.delivery.complete",
      { orderId: flashOrder.orderId },
      merchantToken,
    );
    const deliveredFlash = await callTrpc<any>(
      "pediu.orders.get",
      { orderId: flashOrder.orderId },
      customerToken,
      "query",
    );
    assert.equal(deliveredFlash.status, "Entregue");
    const [tipRows] = await connection.execute(
      `SELECT amount, destination, status, orderId
       FROM pediu_tip_settlements WHERE orderId = ?`,
      [flashOrder.orderId],
    );
    assert.deepEqual((tipRows as any[])[0], {
      amount: "5.00",
      destination: "courier",
      status: "settled",
      orderId: flashOrder.orderId,
    });

    // Mercado é delivery-first; o caso pickup abaixo usa a mesma estrutura
    // depois de convertê-la temporariamente em uma loja comum.
    await connection.execute(
      "UPDATE pediu_stores SET kind = 'restaurant' WHERE id = ?",
      [storeId],
    );
    const pickupTotal = "120.00";
    const pickupOrder = await callTrpc<any>(
      "pediu.orders.create",
      {
        idempotencyKey: `${idempotencyPrefix}-pickup-order`,
        storeId,
        total: pickupTotal,
        paymentMethod: "cash",
        fulfillmentMode: "pickup",
        fulfillment: "standard",
        tipAmount: 0,
        items: [{ productId, quantity: 2, unitPrice: "0.01" }],
      },
      customerToken,
    );
    assert.ok(pickupOrder.orderId > 0);
    orderIds.push(pickupOrder.orderId);
    for (const status of [
      "Aceito",
      "Preparando",
      "Pronto",
      "Entregue",
    ] as const) {
      await callTrpc(
        "pediu.orders.status",
        {
          orderId: pickupOrder.orderId,
          status,
        },
        merchantToken,
      );
    }
    const deliveredPickup = await callTrpc<any>(
      "pediu.orders.get",
      { orderId: pickupOrder.orderId },
      customerToken,
      "query",
    );
    assert.equal(deliveredPickup.status, "Entregue");

    const [accountRows] = await connection.execute(
      "SELECT points, lifetimePoints, tier FROM pediu_loyalty_accounts WHERE userId = ?",
      [customerId],
    );
    const account = (accountRows as any[])[0];
    assert.ok(account, "conta Club não foi criada após pedidos entregues");
    // Flash: 127.50 - tip 5 = 122.50 => 122 points; pickup => 120 points.
    assert.equal(account.points, 242);
    assert.equal(account.lifetimePoints, 242);
    assert.equal(account.tier, "bronze");

    const [ledgerRows] = await connection.execute(
      `SELECT direction, points, reason, orderId, idempotencyKey
       FROM pediu_loyalty_ledger WHERE userId = ? ORDER BY id`,
      [customerId],
    );
    assert.deepEqual(
      (ledgerRows as any[]).map((row) => ({
        direction: row.direction,
        points: row.points,
        reason: row.reason,
        orderId: row.orderId,
      })),
      [
        {
          direction: "credit",
          points: 122,
          reason: "order_delivered",
          orderId: flashOrder.orderId,
        },
        {
          direction: "credit",
          points: 120,
          reason: "order_delivered",
          orderId: pickupOrder.orderId,
        },
      ],
    );

    const redeemInput = {
      blocks: 1,
      idempotencyKey: `${idempotencyPrefix}-redeem`,
    };
    const redeemResults = await Promise.all([
      callTrpc<any>("pediu.loyalty.redeem", redeemInput, customerToken),
      callTrpc<any>("pediu.loyalty.redeem", redeemInput, customerToken),
    ]);
    assert.equal(redeemResults[0].couponCode, redeemResults[1].couponCode);
    assert.equal(
      new Set(redeemResults.map((result) => result.duplicate)).size,
      2,
      "duas tentativas concorrentes deveriam ter uma criação e um retry",
    );
    assert.equal(
      redeemResults.find((result) => !result.duplicate)?.balance,
      142,
    );
    await expectRejected(
      () => callTrpc("pediu.loyalty.redeem", redeemInput, otherCustomerToken),
      /outro usuário/i,
    );

    const [afterRedeemRows] = await connection.execute(
      "SELECT points FROM pediu_loyalty_accounts WHERE userId = ?",
      [customerId],
    );
    assert.equal((afterRedeemRows as any[])[0]?.points, 142);
    const [debitRows] = await connection.execute(
      `SELECT direction, points, note FROM pediu_loyalty_ledger
       WHERE userId = ? AND idempotencyKey = ?`,
      [customerId, redeemInput.idempotencyKey],
    );
    assert.deepEqual(
      (debitRows as any[]).map((row) => row.direction),
      ["debit"],
    );
    assert.equal((debitRows as any[])[0]?.points, 100);

    console.log(
      JSON.stringify(
        {
          ok: true,
          apiBaseUrl,
          storeId,
          productId,
          orderIds,
          flashTotal: flashQuote.total,
          clubBalanceAfterRedeem: (afterRedeemRows as any[])[0]?.points,
          loyaltyLedgerEntries: (ledgerRows as any[]).length + 1,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("[go-live:flash-loyalty] FAILED", error);
  process.exitCode = 1;
});
