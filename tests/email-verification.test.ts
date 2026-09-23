import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashEmailToken, registerEmailVerificationRoutes } from "../server/email-verification";
import * as db from "../server/db";

afterEach(() => vi.restoreAllMocks());

async function withEmailServer<T>(callback: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  registerEmailVerificationRoutes(app);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Email test server did not start");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe("email verification boundary", () => {
  it("hashes tokens before they are looked up", () => {
    expect(hashEmailToken("token-value")).toBe("e6c02a5742ea9d4de588eb9b9de7bed43dc17011552186bed3e98b2c5958ff4a");
  });

  it("rejects malformed tokens without database access", async () => {
    const confirm = vi.spyOn(db, "confirmEmailVerification");
    await withEmailServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/verify-email?token=not-valid`);
      expect(response.status).toBe(400);
    });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("returns gone for an expired or already-used token", async () => {
    vi.spyOn(db, "confirmEmailVerification").mockResolvedValue(false);
    await withEmailServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/verify-email?token=${"a".repeat(64)}`);
      expect(response.status).toBe(410);
    });
  });
});
