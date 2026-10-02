import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for tracking smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for tracking smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for tracking smoke.");

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
  assert.ok(Number.isInteger(id) && id > 0, "fixture insert did not return id");
  return id;
}

async function main() {
  const mysql = await import("mysql2/promise");
  const { sdk } = await import("../server/_core/sdk");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const customerOpenId = `ci-tracking-customer-${runId}`;
  const merchantOpenId = `ci-tracking-merchant-${runId}`;
  const orderKey = `ci-tracking-order-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let storeId: number | undefined;
  let orderId: number | undefined;
  let assignmentId: number | undefined;

  try {
    const createUser = async (
      openId: string,
      name: string,
      role: "user" | "merchant",
    ) => {
      const [result] = await connection.execute(
        "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
        [openId, name, `${openId}@example.test`, "e2e", role],
      );
      return insertId(result);
    };

    customerId = await createUser(
      customerOpenId,
      "Cliente Tracking E2E",
      "user",
    );
    merchantId = await createUser(
      merchantOpenId,
      "Lojista Tracking E2E",
      "merchant",
    );

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, address, deliveryFee, deliveryEnabled, pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        `Loja Tracking ${runId}`,
        "Rua Tracking, 10",
        "5.00",
        1,
        1,
        "10.00",
        "-23.5505200",
        "-46.6333080",
        1,
      ],
    );
    storeId = insertId(storeResult);

    const [orderResult] = await connection.execute(
      "INSERT INTO pediu_orders (customerId, storeId, status, total, discount, deliveryAddress, fulfillmentMode, deliveryFeeSnapshot, idempotencyKey) VALUES (?, ?, 'Pronto', '25.00', '0.00', 'Rua Tracking, 10', 'delivery', '5.00', ?)",
      [customerId, storeId, orderKey],
    );
    orderId = insertId(orderResult);

    const [assignmentResult] = await connection.execute(
      "INSERT INTO pediu_delivery_assignments (orderId, courierId, courierName, etaMinutes, status) VALUES (?, ?, ?, ?, 'assigned')",
      [orderId, merchantId, "Operador Tracking", 18],
    );
    assignmentId = insertId(assignmentResult);

    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Tracking E2E",
      expiresInMs: 15 * 60_000,
    });
    const merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista Tracking E2E",
      expiresInMs: 15 * 60_000,
    });

    const now = Date.now();
    const newestCapturedAt = new Date(now - 30_000);
    const delayedCapturedAt = new Date(now - 90_000);
    const newest = await callTrpc<{ locationId: number }>(
      "pediu.experience.delivery.location",
      {
        orderId,
        latitude: -23.55052,
        longitude: -46.633308,
        etaMinutes: 18,
        capturedAt: newestCapturedAt.toISOString(),
        idempotencyKey: `ci-tracking-newest-${runId}`,
      },
      merchantToken,
      "POST",
    );
    assert.ok(newest.locationId > 0);

    const delayed = await callTrpc<{ locationId: number }>(
      "pediu.experience.delivery.location",
      {
        orderId,
        latitude: -23.56052,
        longitude: -46.643308,
        etaMinutes: 25,
        capturedAt: delayedCapturedAt.toISOString(),
        idempotencyKey: `ci-tracking-delayed-${runId}`,
      },
      merchantToken,
      "POST",
    );
    assert.ok(delayed.locationId > 0);

    const current = await callTrpc<{
      latestLocation: {
        latitude: string;
        longitude: string;
        capturedAt: string;
      } | null;
      assignment: {
        currentLatitude: string;
        currentLongitude: string;
        lastLocationAt: string | Date | null;
      } | null;
      locationAgeSeconds: number | null;
      locationFreshness: string;
    }>("pediu.experience.delivery.current", { orderId }, customerToken);
    assert.equal(current.locationFreshness, "fresh");
    assert.ok((current.locationAgeSeconds ?? 999) >= 20);
    assert.ok((current.locationAgeSeconds ?? 0) < 90);
    assert.equal(
      Number(current.latestLocation?.latitude).toFixed(5),
      "-23.55052",
    );
    assert.equal(
      Number(current.assignment?.currentLatitude).toFixed(5),
      "-23.55052",
    );

    await assert.rejects(
      callTrpc(
        "pediu.experience.delivery.location",
        {
          orderId,
          latitude: -23.57052,
          longitude: -46.653308,
          capturedAt: new Date(now + 3 * 60_000).toISOString(),
          idempotencyKey: `ci-tracking-future-${runId}`,
        },
        merchantToken,
        "POST",
      ),
      /janela segura/,
    );

    await connection.execute(
      "UPDATE pediu_delivery_locations SET capturedAt = ? WHERE id = ?",
      [new Date(now - 2 * 60_000), newest.locationId],
    );
    const stale = await callTrpc<{ locationFreshness: string }>(
      "pediu.experience.delivery.current",
      { orderId },
      customerToken,
    );
    assert.equal(stale.locationFreshness, "stale");

    console.log(
      JSON.stringify({
        ok: true,
        capturedAtPersisted: true,
        delayedSampleDidNotRewindAssignment: true,
        futureSampleRejected: true,
        freshnessAndStaleStates: true,
      }),
    );
  } finally {
    if (orderId) {
      await connection.execute(
        "DELETE FROM pediu_delivery_locations WHERE orderId = ?",
        [orderId],
      );
      await connection.execute(
        "DELETE FROM pediu_delivery_assignments WHERE orderId = ?",
        [orderId],
      );
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        orderId,
      ]);
    }
    if (assignmentId && !orderId) {
      await connection.execute(
        "DELETE FROM pediu_delivery_assignments WHERE id = ?",
        [assignmentId],
      );
    }
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    if (customerId)
      await connection.execute("DELETE FROM users WHERE id = ?", [customerId]);
    if (merchantId)
      await connection.execute("DELETE FROM users WHERE id = ?", [merchantId]);
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
