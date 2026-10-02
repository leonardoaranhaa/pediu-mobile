import { describe, expect, it } from "vitest";

import {
  boundedDispatchOfferTtl,
  dispatchOfferExpiresAt,
  dispatchReofferKey,
} from "../server/domain/dispatch";

describe("dispatch reoffer policy", () => {
  it("bounds a courier offer TTL to one minute through two hours", () => {
    expect(boundedDispatchOfferTtl(10_000)).toBe(60_000);
    expect(boundedDispatchOfferTtl(15 * 60_000)).toBe(15 * 60_000);
    expect(boundedDispatchOfferTtl(3 * 60 * 60_000)).toBe(120 * 60_000);
    expect(boundedDispatchOfferTtl(Number.NaN)).toBe(10 * 60_000);
  });

  it("calculates expiration from the supplied clock", () => {
    const now = new Date("2026-10-01T12:00:00.000Z");
    expect(dispatchOfferExpiresAt(now, 2 * 60_000).toISOString()).toBe(
      "2026-10-01T12:02:00.000Z",
    );
  });

  it("keeps reoffer retries on one deterministic key per order and courier", () => {
    expect(dispatchReofferKey(42, 77)).toBe("dispatch-reoffer-42-77");
    expect(dispatchReofferKey(42, 77)).toBe(dispatchReofferKey(42, 77));
    expect(dispatchReofferKey(42, 78)).not.toBe(dispatchReofferKey(42, 77));
  });
});
