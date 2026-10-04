import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const jwtVerify = vi.fn();
vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: (...args: unknown[]) => jwtVerify(...args),
}));

import * as db from "../server/db";
import { registerAppleAuthRoutes } from "../server/_core/apple-auth";

async function postApple(body: unknown) {
  const app = express();
  app.use(express.json());
  registerAppleAuthRoutes(app);
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    return await fetch(`http://127.0.0.1:${port}/api/auth/apple`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe("Sign in with Apple", () => {
  const previousBundle = process.env.APPLE_BUNDLE_ID;

  afterEach(() => {
    jwtVerify.mockReset();
    vi.restoreAllMocks();
    if (previousBundle === undefined) delete process.env.APPLE_BUNDLE_ID;
    else process.env.APPLE_BUNDLE_ID = previousBundle;
  });

  it("stays unavailable until the iOS bundle id is configured", async () => {
    delete process.env.APPLE_BUNDLE_ID;
    const response = await postApple({});
    expect(response.status).toBe(503);
  });

  it("rejects an identity token the Apple keys do not accept", async () => {
    process.env.APPLE_BUNDLE_ID = "app.pediu.mobile";
    jwtVerify.mockRejectedValue(new Error("invalid"));
    const response = await postApple({ identityToken: "not-a-real-apple-identity-token" });
    expect(response.status).toBe(401);
  });

  it("refuses a previously deleted Apple identity", async () => {
    process.env.APPLE_BUNDLE_ID = "app.pediu.mobile";
    jwtVerify.mockResolvedValue({ payload: { sub: "apple-subject", email: "pessoa@example.com" } });
    vi.spyOn(db, "isIdentityRevoked").mockResolvedValue(true);
    const response = await postApple({ identityToken: "signed-apple-identity-token", name: "Pessoa" });
    expect(response.status).toBe(403);
  });
});
