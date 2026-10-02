import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  createOrderWithPayment,
  expireStaleInventoryReservations,
} from "../server/db";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for inventory expiry smoke.");

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(Number.isInteger(id) && id > 0, "Fixture insert did not return id");
  return id;
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-inventory-expiry-customer-${runId}`;
  const merchantOpenId = `ci-inventory-expiry-merchant-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  const orderIds: number[] = [];

  try {
    customerId = insertId(
      (
        await connection.execute(
          "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
          [
            customerOpenId,
            "Cliente Inventory Expiry",
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
            "Lojista Inventory Expiry",
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
            `Loja Inventory Expiry ${runId}`,
            "Rua Reserva, 10",
            "0.00",
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
          "INSERT INTO pediu_products (storeId, name, category, description, price, available, inventoryTracked, stockQuantity, reservedQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            storeId,
            `Produto Inventory Expiry ${runId}`,
            "Lanches",
            "Fixture de expiração atômica",
            "10.00",
            1,
            1,
            2,
            0,
          ],
        )
      )[0],
    );
    const fixtureCustomerId = customerId;
    const fixtureStoreId = storeId;
    const fixtureProductId = productId;
    assert.ok(fixtureCustomerId && fixtureStoreId && fixtureProductId);

    const createFixtureOrder = async (idempotencyKey: string) => {
      const created = await createOrderWithPayment(
        {
          customerId: fixtureCustomerId,
          storeId: fixtureStoreId,
          status: "Pendente",
          total: "10.00",
          discount: "0.00",
          deliveryAddress: "Rua Reserva, 10",
          fulfillmentMode: "delivery",
          deliveryFeeSnapshot: "0.00",
          idempotencyKey,
        } as any,
        [{ productId: fixtureProductId, quantity: 1, unitPrice: "10.00" }],
        "cash",
      );
      orderIds.push(created.orderId);
      return created.orderId;
    };

    const expiredOrderId = await createFixtureOrder(
      `ci-inventory-expiry-pending-${runId}`,
    );
    const protectedOrderId = await createFixtureOrder(
      `ci-inventory-expiry-accepted-${runId}`,
    );
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 31 * 60_000);
    await connection.execute(
      "UPDATE pediu_orders SET createdAt = ?, updatedAt = ? WHERE id IN (?, ?)",
      [expiredAt, expiredAt, expiredOrderId, protectedOrderId],
    );
    await connection.execute(
      "UPDATE pediu_orders SET status = 'Aceito' WHERE id = ?",
      [protectedOrderId],
    );

    const [firstSweep, concurrentSweep] = await Promise.all([
      expireStaleInventoryReservations({
        now,
        ttlMs: 30 * 60_000,
        limit: 20,
      }),
      expireStaleInventoryReservations({
        now,
        ttlMs: 30 * 60_000,
        limit: 20,
      }),
    ]);
    assert.deepEqual(
      [...firstSweep, ...concurrentSweep].sort((a, b) => a - b),
      [expiredOrderId],
    );

    const [expiredRows] = await connection.execute(
      "SELECT status FROM pediu_orders WHERE id = ? LIMIT 1",
      [expiredOrderId],
    );
    assert.equal((expiredRows as any[])[0]?.status, "Cancelado");
    const [paymentRows] = await connection.execute(
      "SELECT status FROM pediu_payments WHERE orderId = ? LIMIT 1",
      [expiredOrderId],
    );
    assert.equal((paymentRows as any[])[0]?.status, "cancelled");
    const [productRows] = await connection.execute(
      "SELECT reservedQuantity FROM pediu_products WHERE id = ? LIMIT 1",
      [productId],
    );
    assert.equal(Number((productRows as any[])[0]?.reservedQuantity), 1);

    const [protectedRows] = await connection.execute(
      "SELECT status FROM pediu_orders WHERE id = ? LIMIT 1",
      [protectedOrderId],
    );
    assert.equal((protectedRows as any[])[0]?.status, "Aceito");
    const secondSweep = await expireStaleInventoryReservations({
      now,
      ttlMs: 30 * 60_000,
      limit: 20,
    });
    assert.deepEqual(secondSweep, []);

    console.log(
      JSON.stringify({
        ok: true,
        expiredOrderId,
        protectedOrderId,
        releasedReservation: true,
        pendingPaymentCancelled: true,
        repeatSweepIdempotent: true,
      }),
    );
  } finally {
    if (orderIds.length > 0) {
      await connection.execute(
        `DELETE FROM pediu_payments WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
        orderIds,
      );
      await connection.execute(
        `DELETE FROM pediu_order_items WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
        orderIds,
      );
      await connection.execute(
        `DELETE FROM pediu_orders WHERE id IN (${orderIds.map(() => "?").join(",")})`,
        orderIds,
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `[go-live:inventory-expiry] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
