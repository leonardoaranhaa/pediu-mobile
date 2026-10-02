import { afterEach, describe, expect, it, vi } from "vitest";

import * as db from "../server/db";
import { enforceDistributedRateLimit } from "../server/_core/distributed-rate-limit";

const context = () =>
  ({
    req: {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
      headers: {},
    },
    res: { setHeader: vi.fn() },
  }) as any;

describe("distributed rate-limit enforcement", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the persisted decision and exposes Retry-After when blocked", async () => {
    vi.spyOn(db, "consumeDistributedRateLimit").mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 7,
    });
    const ctx = context();
    await expect(
      enforceDistributedRateLimit(ctx, {
        scope: "test",
        identity: 42,
        limit: 2,
        windowMs: 60_000,
        message: "blocked",
      }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: "blocked" });
    expect(ctx.res.setHeader).toHaveBeenCalledWith("Retry-After", "7");
    expect(db.consumeDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2, windowMs: 60_000 }),
    );
  });

  it("fails closed when the shared bucket store is unavailable", async () => {
    vi.spyOn(db, "consumeDistributedRateLimit").mockRejectedValue(
      new Error("database offline"),
    );
    await expect(
      enforceDistributedRateLimit(context(), {
        scope: "test",
        limit: 2,
        windowMs: 60_000,
        message: "blocked",
      }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
