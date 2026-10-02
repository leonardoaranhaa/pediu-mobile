import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { sdk } from "../server/_core/sdk";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl)
  throw new Error("DATABASE_URL is required for the storage security smoke.");
if (!process.env.VITE_APP_ID?.trim())
  throw new Error("VITE_APP_ID is required for the storage security smoke.");
if (!process.env.JWT_SECRET?.trim())
  throw new Error("JWT_SECRET is required for the storage security smoke.");

function insertId(result: any): number {
  const id = Number(result.insertId);
  assert.ok(
    Number.isInteger(id) && id > 0,
    "Storage fixture user insert did not return an id",
  );
  return id;
}

function rawGet(path: string): Promise<{ status: number; body: string }> {
  const base = new URL(apiBaseUrl);
  if (base.protocol !== "http:")
    throw new Error("Storage raw path smoke requires an HTTP target");
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: base.hostname,
        port: base.port,
        path,
        method: "GET",
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function main() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const ownerOpenId = `ci-storage-owner-${runId}`;
  const otherOpenId = `ci-storage-other-${runId}`;
  let ownerId: number | undefined;
  let otherId: number | undefined;

  try {
    const [ownerResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        ownerOpenId,
        "Storage Owner",
        `${ownerOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    ownerId = insertId(ownerResult);
    const [otherResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [
        otherOpenId,
        "Storage Other",
        `${otherOpenId}@example.test`,
        "e2e",
        "user",
      ],
    );
    otherId = insertId(otherResult);

    const ownerToken = await sdk.createSessionToken(ownerOpenId, {
      name: "Storage Owner",
    });
    const ownerPath = `/manus-storage/voice/${ownerId}/sample.wav`;
    const otherPath = `/manus-storage/voice/${otherId}/private.wav`;
    const traversalPath = `/manus-storage/voice/${ownerId}/%2e%2e/voice/${otherId}/private.wav`;

    const traversal = await rawGet(traversalPath);
    assert.equal(traversal.status, 400);

    const anonymous = await fetch(`${apiBaseUrl}${ownerPath}`);
    assert.equal(anonymous.status, 401);

    const crossUser = await fetch(`${apiBaseUrl}${otherPath}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(crossUser.status, 403);

    const ownNamespace = await fetch(`${apiBaseUrl}${ownerPath}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownNamespace.status, 503);
    assert.equal(await ownNamespace.text(), "Storage proxy not configured");

    console.log(
      "Go-Live storage security smoke passed: traversal, anonymous access and cross-user namespace were blocked; own namespace failed closed without an external storage backend.",
    );
  } finally {
    if (ownerId || otherId) {
      await connection.execute("DELETE FROM users WHERE id IN (?, ?)", [
        ownerId ?? 0,
        otherId ?? 0,
      ]);
    }
    await connection.end();
  }
}

void main().catch((error) => {
  console.error(
    `Go-Live storage security failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
