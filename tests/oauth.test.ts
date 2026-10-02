import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import * as db from "../server/db";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { sdk } from "../server/_core/sdk";

const validState = Buffer.from("pediupediu://oauth/callback", "utf8").toString(
  "base64",
);
const oauthUser = {
  id: 501,
  openId: "oauth-user-501",
  name: "Pessoa OAuth",
  email: "oauth@example.test",
  loginMethod: "google",
  role: "user" as const,
  themePreference: "classic" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

async function request(path: string) {
  const app = express();
  registerOAuthRoutes(app);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server address unavailable");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      redirect: "manual",
    });
    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("OAuth callback security boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects malformed state before contacting the provider", async () => {
    const exchange = vi.spyOn(sdk, "exchangeCodeForToken");

    const result = await request(
      "/api/oauth/mobile?code=code-1&state=not-base64",
    );

    expect(result).toEqual({
      status: 400,
      body: { error: "invalid OAuth state" },
    });
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each([
    Buffer.from("javascript:alert(1)", "utf8").toString("base64"),
    Buffer.from("https://user:password@example.test/callback", "utf8").toString(
      "base64",
    ),
    Buffer.from("https://example.test/callback#fragment", "utf8").toString(
      "base64",
    ),
  ])("rejects unsafe redirect URI encoded in state: %s", async (state) => {
    const exchange = vi.spyOn(sdk, "exchangeCodeForToken");

    const result = await request(
      `/api/oauth/mobile?code=code-unsafe&state=${encodeURIComponent(state)}`,
    );

    expect(result).toEqual({
      status: 400,
      body: { error: "invalid OAuth state" },
    });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("blocks replay of a callback before a second token exchange", async () => {
    vi.spyOn(sdk, "exchangeCodeForToken").mockResolvedValue({
      accessToken: "provider-access-token",
    } as any);
    vi.spyOn(sdk, "getUserInfo").mockResolvedValue({
      openId: oauthUser.openId,
      name: oauthUser.name,
      email: oauthUser.email,
      loginMethod: oauthUser.loginMethod,
    } as any);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("session-token");
    vi.spyOn(db, "upsertUser").mockResolvedValue(undefined as any);
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue(oauthUser as any);

    const first = await request(
      `/api/oauth/mobile?code=code-replay&state=${encodeURIComponent(validState)}`,
    );
    const second = await request(
      `/api/oauth/mobile?code=code-replay&state=${encodeURIComponent(validState)}`,
    );

    expect(first.status).toBe(200);
    expect(second).toEqual({
      status: 409,
      body: { error: "OAuth authorization code already used" },
    });
    expect(sdk.exchangeCodeForToken).toHaveBeenCalledTimes(1);
  });

  it("releases a failed exchange so a controlled retry can proceed", async () => {
    const exchange = vi
      .spyOn(sdk, "exchangeCodeForToken")
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValue({ accessToken: "provider-access-token" } as any);
    vi.spyOn(sdk, "getUserInfo").mockResolvedValue({
      openId: oauthUser.openId,
      name: oauthUser.name,
      email: oauthUser.email,
      loginMethod: oauthUser.loginMethod,
    } as any);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("session-token");
    vi.spyOn(db, "upsertUser").mockResolvedValue(undefined as any);
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue(oauthUser as any);

    const first = await request(
      `/api/oauth/mobile?code=code-retry&state=${encodeURIComponent(validState)}`,
    );
    const second = await request(
      `/api/oauth/mobile?code=code-retry&state=${encodeURIComponent(validState)}`,
    );

    expect(first).toEqual({
      status: 500,
      body: { error: "OAuth mobile exchange failed" },
    });
    expect(second.status).toBe(200);
    expect(exchange).toHaveBeenCalledTimes(2);
  });
});
