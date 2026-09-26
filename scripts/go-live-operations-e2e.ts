import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for the operations E2E smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for the operations E2E smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for the operations E2E smoke.");

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
  const customerOpenId = `ci-ops-customer-${runId}`;
  const merchantOpenId = `ci-ops-merchant-${runId}`;
  const courierOpenId = `ci-ops-courier-${runId}`;
  const adminOpenId = `ci-ops-admin-${runId}`;
  const orderKey = `ci-ops-order-${runId}`;
  let customerId: number | undefined;
  let merchantId: number | undefined;
  let courierId: number | undefined;
  let adminId: number | undefined;
  let storeId: number | undefined;
  let productId: number | undefined;
  let addressId: number | undefined;
  let orderId: number | undefined;

  try {
    const [customerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        customerOpenId,
        "Cliente Operações E2E",
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
        "Lojista Operações E2E",
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
        "Courier Operações E2E",
        `${courierOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    courierId = insertId(courierResult);
    const [adminResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        adminOpenId,
        "Admin Operações E2E",
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
        `Loja Operações ${runId}`,
        "11999990000",
        "Rua Operacional, 10",
        `pix-ops-${runId}`,
        "4.50",
        1,
      ],
    );
    storeId = insertId(storeResult);
    const [productResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeId,
        `Produto Operações ${runId}`,
        "Lanches",
        "Fixture operacional",
        "15.00",
        1,
      ],
    );
    productId = insertId(productResult);

    const { sdk } = await import("../server/_core/sdk");
    const customerToken = await sdk.createSessionToken(customerOpenId, {
      name: "Cliente Operações E2E",
      expiresInMs: 15 * 60_000,
    });
    const merchantToken = await sdk.createSessionToken(merchantOpenId, {
      name: "Lojista Operações E2E",
      expiresInMs: 15 * 60_000,
    });
    const courierToken = await sdk.createSessionToken(courierOpenId, {
      name: "Courier Operações E2E",
      expiresInMs: 15 * 60_000,
    });
    const adminToken = await sdk.createSessionToken(adminOpenId, {
      name: "Admin Operações E2E",
      expiresInMs: 15 * 60_000,
    });

    addressId = await callTrpc<number>(
      "pediu.addresses.create",
      {
        label: "Casa Operações",
        recipientName: "Cliente Operações E2E",
        street: "Rua da Entrega",
        number: "45",
        complement: "Casa B",
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
      { storeId, items: [{ productId, quantity: 1 }] },
      customerToken,
    );
    assert.equal(quote.total, "19.50");
    const created = await callTrpc<{
      orderId: number;
      paymentId: number | null;
      status: string;
    }>(
      "pediu.orders.create",
      {
        idempotencyKey: orderKey,
        storeId,
        total: quote.total,
        paymentMethod: "cash",
        addressId,
        items: [{ productId, quantity: 1, unitPrice: "15.00" }],
      },
      customerToken,
      "POST",
    );
    orderId = created.orderId;
    assert.equal(created.status, "Pendente");
    assert.ok(created.paymentId !== null);

    const transitions = ["Aceito", "Preparando", "Pronto"] as const;
    for (const status of transitions) {
      const results = await Promise.all(
        Array.from({ length: 2 }, () =>
          callTrpc<{ success: true }>(
            "pediu.orders.status",
            { orderId, status },
            merchantToken,
            "POST",
          ),
        ),
      );
      assert.deepEqual(results, [{ success: true }, { success: true }]);
    }

    const merchantOrders = await callTrpc<
      Array<{ id: number; status: string }>
    >("pediu.orders.storeMine", { limit: 20, offset: 0 }, merchantToken);
    assert.ok(
      merchantOrders.some(
        (order) => order.id === orderId && order.status === "Pronto",
      ),
    );

    const profile = await callTrpc<{ id: number; status: string }>(
      "pediu.courier.profile.register",
      { vehicleType: "moto", vehiclePlate: "ABC1D23", phone: "11988887777" },
      courierToken,
      "POST",
    );
    assert.equal(profile.status, "pending");
    const reviewed = await callTrpc<{ status: string }>(
      "admin.courierReview",
      { profileId: profile.id, status: "approved" },
      adminToken,
      "POST",
    );
    assert.equal(reviewed.status, "approved");
    const linked = await callTrpc<{ status: string }>(
      "pediu.stores.linkCourier",
      { courierUserId: courierId },
      merchantToken,
      "POST",
    );
    assert.equal(linked.status, "active");
    await callTrpc(
      "pediu.courier.profile.availability",
      { value: "available" },
      courierToken,
      "POST",
    );
    const offer = await callTrpc<{ id: number; status: string }>(
      "pediu.experience.delivery.offer",
      {
        orderId,
        courierUserId: courierId,
        etaMinutes: 25,
        message: "Oferta E2E",
        idempotencyKey: `ci-ops-offer-${runId}`,
        expiresInMinutes: 10,
      },
      merchantToken,
      "POST",
    );
    assert.equal(offer.status, "pending");
    const accepted = await callTrpc<{
      offer: { status: string };
      assignment: { status: string };
    }>(
      "pediu.courier.acceptOffer",
      { offerId: offer.id },
      courierToken,
      "POST",
    );
    assert.equal(accepted.offer.status, "accepted");
    assert.equal(accepted.assignment.status, "assigned");
    await callTrpc(
      "pediu.courier.profile.locationConsent",
      { accepted: true },
      courierToken,
      "POST",
    );

    const location = await callTrpc<{
      locationId: number;
      status: string;
      assignment: { status: string };
    }>(
      "pediu.experience.delivery.location",
      {
        orderId,
        latitude: -23.55052,
        longitude: -46.633308,
        etaMinutes: 18,
        idempotencyKey: `ci-ops-location-${runId}`,
      },
      courierToken,
      "POST",
    );
    assert.ok(location.locationId > 0);
    assert.equal(location.status, "A caminho");
    assert.equal(location.assignment.status, "in_transit");

    const current = await callTrpc<{
      status: string;
      assignment: { courierName: string; status: string };
      latestLocation: {
        latitude: string;
        longitude: string;
        etaMinutes: number;
      };
    }>("pediu.experience.delivery.current", { orderId }, customerToken);
    assert.equal(current.status, "A caminho");
    assert.equal(current.assignment.courierName, "Courier Operações E2E");
    assert.equal(current.assignment.status, "in_transit");
    assert.equal(current.latestLocation.etaMinutes, 18);

    const events = await callTrpc<Array<{ eventType: string }>>(
      "pediu.experience.tracking.events",
      { orderId, limit: 100, offset: 0 },
      customerToken,
    );
    assert.deepEqual(events.map((event) => event.eventType).reverse(), [
      "Pendente",
      "Aceito",
      "Preparando",
      "Pronto",
      "A caminho",
    ]);

    const completions = await Promise.all(
      Array.from({ length: 2 }, () =>
        callTrpc<{
          success: true;
          status: string;
          duplicate?: boolean;
        }>(
          "pediu.experience.delivery.complete",
          { orderId },
          courierToken,
          "POST",
        ),
      ),
    );
    assert.ok(
      completions.every(
        (completion) =>
          completion.success === true && completion.status === "Entregue",
      ),
    );

    const finalOrder = await callTrpc<{ id: number; status: string }>(
      "pediu.orders.get",
      { orderId },
      customerToken,
    );
    assert.deepEqual(
      { id: finalOrder.id, status: finalOrder.status },
      { id: orderId, status: "Entregue" },
    );
    const [eventRows] = await connection.execute(
      "SELECT eventType FROM pediu_delivery_events WHERE orderId = ? ORDER BY id",
      [orderId],
    );
    assert.deepEqual(
      (eventRows as Array<{ eventType: string }>).map(
        (event) => event.eventType,
      ),
      ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue"],
    );

    console.log(
      "Go-Live operations E2E passed: courier onboarding, approval, store link, offer, acceptance, GPS, customer tracking and idempotent completion.",
    );
  } finally {
    if (orderId)
      await connection.execute("DELETE FROM pediu_orders WHERE id = ?", [
        orderId,
      ]);
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
    if (adminId)
      await connection.execute(
        "DELETE FROM pediu_admin_audit_logs WHERE actorId = ?",
        [adminId],
      );
    const ids = [customerId, merchantId, courierId, adminId].filter(
      (id): id is number => Boolean(id),
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
    `Go-Live operations E2E failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
