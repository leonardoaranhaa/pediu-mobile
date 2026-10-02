import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for dispatch smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for dispatch smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for dispatch smoke.");

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
  const customerOpenId = `ci-dispatch-customer-${runId}`;
  const merchantOpenId = `ci-dispatch-merchant-${runId}`;
  const courierOpenIds = [1, 2, 3].map(
    (index) => `ci-dispatch-courier-${index}-${runId}`,
  );
  const orderKeys = [1, 2].map(
    (index) => `ci-dispatch-order-${index}-${runId}`,
  );
  let customerId: number | undefined;
  let merchantId: number | undefined;
  const courierIds: number[] = [];
  let storeId: number | undefined;
  const orderIds: number[] = [];

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

  try {
    customerId = await createUser(
      customerOpenId,
      "Cliente Dispatch E2E",
      "user",
    );
    merchantId = await createUser(
      merchantOpenId,
      "Lojista Dispatch E2E",
      "merchant",
    );
    for (const [index, openId] of courierOpenIds.entries()) {
      courierIds.push(
        await createUser(openId, `Courier Dispatch ${index + 1}`, "user"),
      );
    }

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, address, deliveryFee, deliveryEnabled, pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        merchantId,
        `Loja Dispatch ${runId}`,
        "Rua Dispatch, 10",
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

    for (const courierId of courierIds) {
      await connection.execute(
        "INSERT INTO pediu_courier_profiles (userId, vehicleType, status, availability, locationConsentAt) VALUES (?, ?, 'approved', 'available', NOW())",
        [courierId, "moto"],
      );
      await connection.execute(
        "INSERT INTO pediu_store_couriers (storeId, courierUserId, status, invitedBy) VALUES (?, ?, 'active', ?)",
        [storeId, courierId, merchantId],
      );
    }

    for (const orderKey of orderKeys) {
      const [orderResult] = await connection.execute(
        "INSERT INTO pediu_orders (customerId, storeId, status, total, discount, deliveryAddress, fulfillmentMode, deliveryFeeSnapshot, idempotencyKey) VALUES (?, ?, 'Pronto', '25.00', '0.00', 'Rua Dispatch, 10', 'delivery', '5.00', ?)",
        [customerId, storeId, orderKey],
      );
      orderIds.push(insertId(orderResult));
    }

    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Dispatch E2E",
      expiresInMs: 15 * 60_000,
    });
    const merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista Dispatch E2E",
      expiresInMs: 15 * 60_000,
    });
    const courierTokens = await Promise.all(
      courierOpenIds.map((openId, index) =>
        sdk.createSessionToken(openId, {
          name: `Courier Dispatch ${index + 1}`,
          expiresInMs: 15 * 60_000,
        }),
      ),
    );

    const initialOffer = await callTrpc<{ id: number; status: string }>(
      "pediu.experience.delivery.offer",
      {
        orderId: orderIds[0],
        courierUserId: courierIds[0],
        idempotencyKey: `ci-dispatch-initial-${runId}`,
        expiresInMinutes: 1,
      },
      merchantToken,
      "POST",
    );
    assert.equal(initialOffer.status, "pending");
    await connection.execute(
      "UPDATE pediu_delivery_offers SET expiresAt = ? WHERE id = ?",
      [new Date(Date.now() - 1_000), initialOffer.id],
    );

    const inboxAfterExpiry = await callTrpc<
      Array<{ id: number; courierUserId?: number; status: string }>
    >("pediu.courier.offers", undefined, courierTokens[1]);
    assert.equal(inboxAfterExpiry.length, 1);
    assert.equal(inboxAfterExpiry[0]?.status, "pending");

    const rejected = await callTrpc<{
      offer: { status: string };
      reoffer?: { id: number; status: string; courierUserId: number };
    }>(
      "pediu.courier.rejectOffer",
      { offerId: inboxAfterExpiry[0]?.id },
      courierTokens[1],
      "POST",
    );
    assert.equal(rejected.offer.status, "rejected");
    assert.equal(rejected.reoffer?.status, "pending");
    assert.equal(rejected.reoffer?.courierUserId, courierIds[2]);

    const accepted = await callTrpc<{
      offer: { status: string };
      assignment?: { orderId: number; courierId: number; status: string };
    }>(
      "pediu.courier.acceptOffer",
      { offerId: rejected.reoffer?.id },
      courierTokens[2],
      "POST",
    );
    assert.equal(accepted.offer.status, "accepted");
    assert.equal(accepted.assignment?.orderId, orderIds[0]);
    assert.equal(accepted.assignment?.courierId, courierIds[2]);
    assert.equal(accepted.assignment?.status, "assigned");
    await connection.execute(
      "UPDATE pediu_courier_profiles SET availability = 'available' WHERE userId = ?",
      [courierIds[2]],
    );

    const secondOffer = await callTrpc<{ id: number; status: string }>(
      "pediu.experience.delivery.offer",
      {
        orderId: orderIds[1],
        courierUserId: courierIds[0],
        idempotencyKey: `ci-dispatch-second-${runId}`,
        expiresInMinutes: 1,
      },
      merchantToken,
      "POST",
    );
    assert.equal(secondOffer.status, "pending");
    await connection.execute(
      "UPDATE pediu_delivery_offers SET expiresAt = ? WHERE id = ?",
      [new Date(Date.now() - 1_000), secondOffer.id],
    );

    await Promise.all([
      callTrpc("pediu.courier.offers", undefined, courierTokens[1]),
      callTrpc("pediu.courier.offers", undefined, courierTokens[2]),
    ]);
    const [secondOfferRows] = await connection.execute(
      "SELECT status, courierUserId, idempotencyKey FROM pediu_delivery_offers WHERE orderId = ? ORDER BY id",
      [orderIds[1]],
    );
    const offers = secondOfferRows as Array<{
      status: string;
      courierUserId: number;
      idempotencyKey: string;
    }>;
    assert.equal(
      offers.filter((offer) => offer.status === "pending").length,
      1,
    );
    assert.equal(
      offers.filter((offer) => offer.status === "expired").length,
      1,
    );
    assert.equal(
      offers.filter((offer) => offer.courierUserId === courierIds[1]).length,
      1,
    );

    const secondPending = offers.find((offer) => offer.status === "pending");
    assert.ok(secondPending);
    const [secondPendingRows] = await connection.execute(
      "SELECT id FROM pediu_delivery_offers WHERE orderId = ? AND status = 'pending' LIMIT 1",
      [orderIds[1]],
    );
    const secondPendingId = Number((secondPendingRows as any[])[0]?.id);
    assert.ok(secondPendingId > 0);
    await callTrpc(
      "pediu.courier.rejectOffer",
      { offerId: secondPendingId },
      courierTokens[1],
      "POST",
    );
    const [thirdPendingRows] = await connection.execute(
      "SELECT id, courierUserId FROM pediu_delivery_offers WHERE orderId = ? AND status = 'pending' LIMIT 1",
      [orderIds[1]],
    );
    const thirdPending = (thirdPendingRows as any[])[0];
    assert.equal(Number(thirdPending?.courierUserId), courierIds[2]);
    await callTrpc(
      "pediu.courier.rejectOffer",
      { offerId: Number(thirdPending.id) },
      courierTokens[2],
      "POST",
    );

    const [finalOrderRows] = await connection.execute(
      "SELECT status FROM pediu_orders WHERE id IN (?, ?) ORDER BY id",
      orderIds,
    );
    assert.deepEqual(
      (finalOrderRows as Array<{ status: string }>).map((row) => row.status),
      ["Pronto", "Pronto"],
    );
    const [assignmentRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM pediu_delivery_assignments WHERE orderId = ?",
      [orderIds[0]],
    );
    assert.equal(Number((assignmentRows as any[])[0]?.count), 1);

    console.log(
      JSON.stringify({
        ok: true,
        expiredAndReoffered: true,
        rejectionReoffered: true,
        concurrentSweepIdempotent: true,
        acceptedAssignment: true,
        noCandidateLeavesOrderReady: true,
      }),
    );
  } finally {
    if (orderIds.length > 0) {
      await connection.execute(
        `DELETE FROM pediu_delivery_locations WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
        orderIds,
      );
      await connection.execute(
        `DELETE FROM pediu_delivery_assignments WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
        orderIds,
      );
      await connection.execute(
        `DELETE FROM pediu_delivery_offers WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
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
    if (storeId) {
      await connection.execute(
        "DELETE FROM pediu_store_couriers WHERE storeId = ?",
        [storeId],
      );
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    }
    if (courierIds.length > 0) {
      await connection.execute(
        `DELETE FROM pediu_courier_profiles WHERE userId IN (${courierIds.map(() => "?").join(",")})`,
        courierIds,
      );
    }
    const userIds = [customerId, merchantId, ...courierIds].filter(
      (id): id is number => Number.isInteger(id),
    );
    if (userIds.length > 0) {
      await connection.execute(
        `DELETE FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`,
        userIds,
      );
    }
    await connection.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `[go-live:dispatch-reoffer] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
