import { describe, expect, it, vi } from "vitest";
import {
  consumeRateLimit,
  isAllowedOrigin,
  resetRateLimitBucketsForTests,
  withConcurrencyLimit,
  withTimeout,
} from "../server/_core/security";

describe("server security controls", () => {
  it("accepts configured local origins and rejects arbitrary origins", () => {
    expect(isAllowedOrigin("http://localhost:8081")).toBe(true);
    expect(isAllowedOrigin("https://attacker.example")).toBe(false);
  });

  it("enforces a bounded request window", () => {
    resetRateLimitBucketsForTests();
    expect(consumeRateLimit("security:test", 2, 60_000, 1_000)).toBe(true);
    expect(consumeRateLimit("security:test", 2, 60_000, 1_001)).toBe(true);
    expect(consumeRateLimit("security:test", 2, 60_000, 1_002)).toBe(false);
    expect(consumeRateLimit("security:test", 2, 60_000, 61_001)).toBe(true);
  });

  it("rejects work over the concurrency limit", async () => {
    resetRateLimitBucketsForTests();
    let release!: () => void;
    const held = withConcurrencyLimit("security:concurrency", 1, () => new Promise<string>((resolve) => {
      release = () => resolve("done");
    }));
    await expect(withConcurrencyLimit("security:concurrency", 1, async () => "blocked")).rejects.toThrow("ocupado");
    release();
    await expect(held).resolves.toBe("done");
  });

  it("times out slow external work", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => undefined), 100, "timed out");
    const assertion = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    vi.useRealTimers();
  });
});
