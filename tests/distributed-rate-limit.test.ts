import { describe, expect, it } from "vitest";

import {
  boundedRateLimitCleanupInterval,
  boundedRateLimitLimit,
  boundedRateLimitWindow,
  decideDistributedRateLimit,
  distributedRateLimitKey,
  retryAfterSeconds,
} from "../server/domain/distributed-rate-limit";

describe("distributed rate-limit policy", () => {
  it("bounds invalid windows and limits to safe values", () => {
    expect(boundedRateLimitWindow(0)).toBe(60_000);
    expect(boundedRateLimitWindow(30_000)).toBe(30_000);
    expect(boundedRateLimitWindow(99 * 60 * 60_000)).toBe(24 * 60 * 60_000);
    expect(boundedRateLimitLimit(0)).toBe(1);
    expect(boundedRateLimitLimit(2.9)).toBe(2);
    expect(boundedRateLimitCleanupInterval(1)).toBe(5_000);
  });

  it("produces bounded, sanitized bucket keys", () => {
    const key = distributedRateLimitKey(
      "voice/interpret",
      "user 42",
      "sha:abc/123",
    );
    expect(key).toBe("voice_interpret:user_42:sha:abc_123");
    expect(key).not.toContain(" ");
    expect(key.length).toBeLessThanOrEqual(255);
  });

  it("allows requests until the limit and returns remaining capacity", () => {
    const expiresAt = new Date("2026-10-02T12:01:00.000Z");
    expect(decideDistributedRateLimit(0, 2, expiresAt)).toMatchObject({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
    expect(decideDistributedRateLimit(1, 2, expiresAt)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("blocks at the limit and calculates a retry-after in seconds", () => {
    const now = new Date("2026-10-02T12:00:00.100Z");
    const expiresAt = new Date("2026-10-02T12:00:05.900Z");
    expect(retryAfterSeconds(expiresAt, now)).toBe(6);
    expect(decideDistributedRateLimit(2, 2, expiresAt, now)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 6,
    });
  });
});
