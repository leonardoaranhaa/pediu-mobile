import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { sdk } from "../server/_core/sdk";
import * as db from "../server/db";
import { cleanExpiredRateLimitBuckets } from "../server/rate-limit-bucket-sweeper";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for rate-limit smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for rate-limit smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for rate-limit smoke.");

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
  const openId = `ci-rate-limit-${runId}`;
  const directBucketKey = `ci-rate-limit-direct-${runId}`;
  let userId: number | undefined;
  let token: string | undefined;

  try {
    const [userResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [openId, "Rate Limit E2E", `${openId}@example.test`, "e2e", "user"],
    );
    userId = insertId(userResult);
    token = await sdk.createSessionToken(openId, {
      name: "Rate Limit E2E",
      expiresInMs: 15 * 60_000,
    });

    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.consumeDistributedRateLimit({
          bucketKey: directBucketKey,
          limit: 1,
          windowMs: 60_000,
        }),
      ),
    );
    assert.equal(
      concurrent.filter((decision) => decision.allowed).length,
      1,
      "exactly one concurrent replica may consume a limit=1 bucket",
    );
    assert.equal(
      concurrent.filter((decision) => !decision.allowed).length,
      7,
      "remaining concurrent replicas must be blocked",
    );

    const responses = await Promise.all(
      Array.from({ length: 21 }, (_, index) =>
        fetch(`${apiBaseUrl}/api/trpc/pediu.orders.create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: {
              idempotencyKey: `ci-rate-limit-order-${runId}-${index}`,
              storeId: 999_999_999,
              total: "10.00",
              paymentMethod: "cash",
              fulfillmentMode: "pickup",
              items: [
                { productId: 999_999_999, quantity: 1, unitPrice: "10.00" },
              ],
            },
          }),
          signal: AbortSignal.timeout(15_000),
        }),
      ),
    );
    const statusCounts = responses.reduce<Record<string, number>>(
      (counts, response) => {
        counts[String(response.status)] =
          (counts[String(response.status)] ?? 0) + 1;
        return counts;
      },
      {},
    );
    assert.equal(
      statusCounts["429"],
      1,
      "the 21st HTTP mutation must be rate limited",
    );
    assert.equal(
      statusCounts["500"],
      20,
      "the first 20 requests must reach the protected procedure",
    );
    const retryAfter = responses
      .find((response) => response.status === 429)
      ?.headers.get("retry-after");
    assert.ok(
      retryAfter && Number(retryAfter) >= 1,
      "429 must expose Retry-After",
    );

    await connection.execute(
      "INSERT INTO pediu_rate_limit_buckets (bucketKey, requestCount, windowStartedAt, expiresAt) VALUES (?, 1, UTC_TIMESTAMP() - INTERVAL 2 MINUTE, UTC_TIMESTAMP() - INTERVAL 1 MINUTE)",
      [`ci-rate-limit-expired-${runId}`],
    );
    const deleted = await cleanExpiredRateLimitBuckets();
    assert.ok(deleted >= 1, "bounded cleanup must remove an expired bucket");

    console.log(
      `Go-Live distributed rate-limit smoke passed: atomic replicas=1/8, HTTP 429=${statusCounts["429"]}, retry-after=${retryAfter}s, cleanup=${deleted}.`,
    );
  } finally {
    await connection.execute(
      "DELETE FROM pediu_rate_limit_buckets WHERE bucketKey LIKE ? OR bucketKey LIKE ? OR bucketKey LIKE ?",
      [
        `${directBucketKey}%`,
        `ci-rate-limit-expired-${runId}%`,
        userId ? `orders:create:${userId}:%` : `orders:create:missing:%`,
      ],
    );
    if (userId) {
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
    }
    await connection.end();
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `Go-Live distributed rate-limit failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exit(1);
  });
