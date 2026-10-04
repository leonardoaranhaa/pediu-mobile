import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import * as db from "../server/db";
import { DEV_PERSONAS, registerDevAuthRoutes } from "../server/_core/dev-auth";
import { ENV, assertRuntimeConfig } from "../server/_core/env";
import { sdk } from "../server/_core/sdk";

const originalEnv = { ...ENV };

beforeEach(() => {
  ENV.appId = "pediu-test";
  ENV.cookieSecret = "dev-auth-test-secret";
  ENV.isProduction = false;
  process.env.DEV_AUTH_ENABLED = "true";
});

afterEach(() => {
  Object.assign(ENV, originalEnv);
  delete process.env.DEV_AUTH_ENABLED;
  vi.restoreAllMocks();
});

async function withDevServer<T>(callback: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use(express.json());
  registerDevAuthRoutes(app);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Dev auth test server did not start");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function login(baseUrl: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/dev/login`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

const seededCustomer = {
  id: 7,
  openId: DEV_PERSONAS.customer.openId,
  name: DEV_PERSONAS.customer.name,
  email: DEV_PERSONAS.customer.email,
  loginMethod: "dev",
  role: "user" as const,
  themePreference: "classic",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  deletedAt: null,
};

describe("development login boundary", () => {
  it("does not expose the route without the explicit flag", async () => {
    delete process.env.DEV_AUTH_ENABLED;
    await withDevServer(async (baseUrl) => {
      expect((await login(baseUrl, { persona: "customer" })).status).toBe(404);
    });
  });

  it("does not expose the route in production even with the flag", async () => {
    ENV.isProduction = true;
    await withDevServer(async (baseUrl) => {
      expect((await login(baseUrl, { persona: "customer" })).status).toBe(404);
    });
  });

  it("refuses to start a production server with the flag set", () => {
    ENV.isProduction = true;
    ENV.databaseUrl = "mysql://example";
    process.env.ALLOWED_ORIGINS = "https://pediu.example";
    process.env.OBSERVABILITY_TOKEN = "test-observability";
    try {
      expect(() => assertRuntimeConfig()).toThrow("DEV_AUTH_ENABLED");
    } finally {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.OBSERVABILITY_TOKEN;
    }
  });

  it("rejects personas outside the seeded allowlist", async () => {
    const lookup = vi.spyOn(db, "getUserByOpenId");
    await withDevServer(async (baseUrl) => {
      expect((await login(baseUrl, { persona: "admin" })).status).toBe(400);
      expect((await login(baseUrl, { persona: "toString" })).status).toBe(400);
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests from unknown origins", async () => {
    await withDevServer(async (baseUrl) => {
      expect((await login(baseUrl, { persona: "customer" }, { origin: "https://evil.example" })).status).toBe(403);
    });
  });

  it("asks for the seed when the persona was not persisted", async () => {
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue(undefined);
    await withDevServer(async (baseUrl) => {
      const response = await login(baseUrl, { persona: "customer" });
      expect(response.status).toBe(404);
      expect((await response.json()).error).toContain("pnpm db:seed");
    });
  });

  it("issues a verifiable session for a seeded persona", async () => {
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue(seededCustomer as any);
    vi.spyOn(db, "upsertUser").mockResolvedValue(undefined);
    await withDevServer(async (baseUrl) => {
      const response = await login(baseUrl, { persona: "customer" }, { origin: "http://localhost:8081" });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user).toMatchObject({ id: 7, openId: "dev-customer", role: "user" });
      expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=${body.app_session_id}`);
      await expect(sdk.verifySession(body.app_session_id)).resolves.toMatchObject({ openId: "dev-customer", appId: "pediu-test" });
    });
  });
});
