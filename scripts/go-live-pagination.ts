import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for pagination smoke.");

function unwrap<T>(body: any): T {
  if (body?.error)
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? "tRPC request failed",
    );
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

async function search(input: Record<string, unknown>) {
  const response = await fetch(
    `${apiBaseUrl}/api/trpc/pediu.marketplace.search?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      `search: HTTP ${response.status} ${body?.error?.json?.message ?? body?.error?.message ?? "unknown"}`,
    );
  return unwrap<{
    items: Array<{ id: number; name: string }>;
    hasMore: boolean;
    nextCursor: string | null;
  }>(body);
}

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(Number.isInteger(id) && id > 0, "fixture insert did not return id");
  return id;
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const category = `Cursor-${runId}`;
  const openId = `ci-pagination-${runId}`;
  let userId: number | undefined;
  let storeId: number | undefined;
  const productIds: number[] = [];

  try {
    const [userResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        openId,
        "Lojista Pagination E2E",
        `${openId}@example.test`,
        "e2e",
        "merchant",
      ],
    );
    userId = insertId(userResult);

    const [storeResult] = await connection.execute(
      "INSERT INTO pediu_stores (ownerId, name, address, deliveryFee, deliveryEnabled, pickupEnabled, deliveryRadiusKm, latitude, longitude, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        `Loja Pagination ${runId}`,
        "Rua Cursor, 10",
        "0.00",
        1,
        1,
        "10.00",
        "-23.5505200",
        "-46.6333080",
        1,
      ],
    );
    storeId = insertId(storeResult);

    for (let index = 0; index < 25; index += 1) {
      const [productResult] = await connection.execute(
        "INSERT INTO pediu_products (storeId, name, category, description, price, available, inventoryTracked, stockQuantity, reservedQuantity, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          storeId,
          `Produto Cursor ${String(index + 1).padStart(2, "0")}`,
          category,
          "Fixture de paginação",
          "10.00",
          1,
          0,
          0,
          0,
          new Date(Date.now() - index * 1_000),
        ],
      );
      productIds.push(insertId(productResult));
    }

    const firstPage = await search({ category, limit: 10 });
    assert.equal(firstPage.items.length, 10);
    assert.equal(firstPage.hasMore, true);
    assert.ok(firstPage.nextCursor, "first page must expose nextCursor");

    const [newProductResult] = await connection.execute(
      "INSERT INTO pediu_products (storeId, name, category, description, price, available, inventoryTracked, stockQuantity, reservedQuantity, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        storeId,
        "Produto inserido entre páginas",
        category,
        "Não pode deslocar o cursor já emitido",
        "10.00",
        1,
        0,
        0,
        0,
        new Date(Date.now() + 60_000),
      ],
    );
    const insertedBetweenPagesId = insertId(newProductResult);
    productIds.push(insertedBetweenPagesId);

    const secondPage = await search({
      category,
      limit: 10,
      cursor: firstPage.nextCursor,
    });
    assert.equal(secondPage.items.length, 10);
    assert.equal(secondPage.hasMore, true);
    assert.ok(secondPage.nextCursor, "second page must expose nextCursor");

    const firstIds = new Set(firstPage.items.map((item) => item.id));
    assert.equal(
      secondPage.items.some((item) => firstIds.has(item.id)),
      false,
    );
    assert.equal(
      secondPage.items.some((item) => item.id === insertedBetweenPagesId),
      false,
    );

    const thirdPage = await search({
      category,
      limit: 10,
      cursor: secondPage.nextCursor,
    });
    assert.equal(thirdPage.items.length, 5);
    assert.equal(thirdPage.hasMore, false);
    assert.equal(thirdPage.nextCursor, null);

    const allIds = [
      ...firstPage.items,
      ...secondPage.items,
      ...thirdPage.items,
    ].map((item) => item.id);
    assert.equal(new Set(allIds).size, 25);
    assert.equal(allIds.includes(insertedBetweenPagesId), false);

    const malformed = await fetch(
      `${apiBaseUrl}/api/trpc/pediu.marketplace.search?input=${encodeURIComponent(JSON.stringify({ json: { category, limit: 10, cursor: "pc1_not-valid" } }))}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const malformedBody = await malformed.json().catch(() => ({}));
    assert.equal(malformed.status, 400);
    assert.match(
      JSON.stringify(malformedBody),
      /Cursor de marketplace inválido/,
    );

    console.log(
      JSON.stringify({
        ok: true,
        pages: [
          firstPage.items.length,
          secondPage.items.length,
          thirdPage.items.length,
        ],
        noDuplicates: new Set(allIds).size === 25,
        insertionDidNotShiftCursor: !allIds.includes(insertedBetweenPagesId),
        malformedCursorRejected: malformed.status === 400,
      }),
    );
  } finally {
    if (productIds.length)
      await connection.query("DELETE FROM pediu_products WHERE id IN (?)", [
        productIds,
      ]);
    if (storeId)
      await connection.execute("DELETE FROM pediu_stores WHERE id = ?", [
        storeId,
      ]);
    if (userId)
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
