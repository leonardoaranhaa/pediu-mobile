import assert from "node:assert/strict";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const allowedOrigin =
  process.env.CORS_ALLOWED_ORIGIN?.trim() || "http://localhost:8081";
const disallowedOrigin = "https://attacker.example";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  return {
    response,
    body: await response.json().catch(() => null),
  };
}

async function main() {
  const allowedPreflight = await request("/api/health", {
    method: "OPTIONS",
    headers: {
      Origin: allowedOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });
  assert.equal(allowedPreflight.response.status, 204);
  assert.equal(
    allowedPreflight.response.headers.get("access-control-allow-origin"),
    allowedOrigin,
  );
  assert.equal(
    allowedPreflight.response.headers.get("access-control-allow-credentials"),
    "true",
  );
  assert.match(allowedPreflight.response.headers.get("vary") ?? "", /Origin/);

  const disallowedPreflight = await request("/api/health", {
    method: "OPTIONS",
    headers: {
      Origin: disallowedOrigin,
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(disallowedPreflight.response.status, 403);
  assert.equal(
    disallowedPreflight.response.headers.get("access-control-allow-origin"),
    null,
  );

  const blockedWithoutOrigin = await request("/api/trpc/auth.logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: null }),
  });
  assert.equal(blockedWithoutOrigin.response.status, 403);

  const blockedDisallowedOrigin = await request("/api/trpc/auth.logout", {
    method: "POST",
    headers: {
      Origin: disallowedOrigin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ json: null }),
  });
  assert.equal(blockedDisallowedOrigin.response.status, 403);
  assert.equal(
    blockedDisallowedOrigin.response.headers.get("access-control-allow-origin"),
    null,
  );

  const allowedMutation = await request("/api/trpc/auth.logout", {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ json: null }),
  });
  assert.equal(allowedMutation.response.status, 200);
  assert.equal(
    allowedMutation.response.headers.get("access-control-allow-origin"),
    allowedOrigin,
  );
  assert.equal(allowedMutation.body?.result?.data?.json?.success, true);
  const setCookie = allowedMutation.response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const bearerMutation = await request("/api/trpc/auth.logout", {
    method: "POST",
    headers: {
      Authorization: "Bearer native-client-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ json: null }),
  });
  assert.equal(bearerMutation.response.status, 200);

  console.log(
    `Go-Live CORS security smoke passed: allowed preflight/mutation succeeded, disallowed origin was blocked, bearer mutation bypassed cookie-origin guard and logout cookie was protected.`,
  );
}

void main().catch((error) => {
  console.error(
    `Go-Live CORS security failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
