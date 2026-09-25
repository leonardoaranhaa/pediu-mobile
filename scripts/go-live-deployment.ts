import assert from "node:assert/strict";
import { URL } from "node:url";

const deploymentUrl = (process.env.DEPLOYMENT_URL ?? "")
  .trim()
  .replace(/\/$/, "");
const required = process.env.DEPLOYMENT_REQUIRED === "1";
const expectedOrigin = (process.env.DEPLOYMENT_ORIGIN ?? "").trim();
const timeoutMs = Number(process.env.DEPLOYMENT_TIMEOUT_MS ?? 10_000);

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  if (!deploymentUrl) {
    const message =
      "DEPLOYMENT_URL is not configured; no real deployment was verified.";
    if (required) fail(message);
    console.log(`NOT_CONFIGURED: ${message}`);
    return;
  }
  const parsed = new URL(deploymentUrl);
  assert.ok(
    ["http:", "https:"].includes(parsed.protocol),
    "DEPLOYMENT_URL must use http or https",
  );
  const healthUrl = `${deploymentUrl}/api/health`;
  const healthResponse = await fetch(healthUrl, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  assert.equal(
    healthResponse.status,
    200,
    `health endpoint returned HTTP ${healthResponse.status}`,
  );
  const health = await healthResponse.json();
  assert.equal(health?.ok, true, "health endpoint must return ok=true");

  const input = encodeURIComponent(
    JSON.stringify({
      json: { query: "", category: "Tudo", limit: 20, offset: 0 },
    }),
  );
  const marketplaceResponse = await fetch(
    `${deploymentUrl}/api/trpc/pediu.marketplace.search?input=${input}`,
    {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    },
  );
  assert.equal(
    marketplaceResponse.status,
    200,
    `marketplace endpoint returned HTTP ${marketplaceResponse.status}`,
  );
  const marketplace = await marketplaceResponse.json();
  assert.ok(!marketplace?.error, "marketplace endpoint returned a tRPC error");
  assert.ok(
    marketplace?.result?.data,
    "marketplace endpoint returned no tRPC result",
  );

  if (expectedOrigin) {
    const optionsResponse = await fetch(healthUrl, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Origin: expectedOrigin,
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.equal(
      optionsResponse.status,
      204,
      `CORS preflight returned HTTP ${optionsResponse.status}`,
    );
    assert.equal(
      optionsResponse.headers.get("access-control-allow-origin"),
      expectedOrigin,
      "CORS must echo only the expected origin",
    );
    assert.notEqual(
      optionsResponse.headers.get("access-control-allow-origin"),
      "*",
      "CORS wildcard is not allowed",
    );
  }

  console.log(
    `Deployment smoke passed: ${parsed.origin} health=200 marketplace=200${expectedOrigin ? " cors=exact" : ""}`,
  );
}

void main().catch((error) => {
  console.error(
    `Deployment smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
