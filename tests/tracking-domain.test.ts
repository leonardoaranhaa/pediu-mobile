import { describe, expect, it } from "vitest";

import {
  classifyTrackingFreshness,
  isTrackingCapturedAtAcceptable,
  trackingAgeSeconds,
} from "../server/domain/tracking";

describe("tracking freshness policy", () => {
  const now = new Date("2026-10-02T12:00:00.000Z");

  it("accepts recent and bounded offline samples", () => {
    expect(
      isTrackingCapturedAtAcceptable(new Date("2026-10-02T11:59:30.000Z"), now),
    ).toBe(true);
    expect(
      isTrackingCapturedAtAcceptable(new Date("2026-10-02T11:45:00.000Z"), now),
    ).toBe(true);
  });

  it("rejects samples outside the reconnect window or too far in the future", () => {
    expect(
      isTrackingCapturedAtAcceptable(new Date("2026-10-02T11:44:59.000Z"), now),
    ).toBe(false);
    expect(
      isTrackingCapturedAtAcceptable(new Date("2026-10-02T12:02:01.000Z"), now),
    ).toBe(false);
  });

  it("classifies fresh, stale and unavailable positions", () => {
    expect(
      classifyTrackingFreshness(new Date("2026-10-02T11:59:30.000Z"), now),
    ).toBe("fresh");
    expect(
      classifyTrackingFreshness(new Date("2026-10-02T11:58:00.000Z"), now),
    ).toBe("stale");
    expect(
      classifyTrackingFreshness(new Date("2026-10-02T11:30:00.000Z"), now),
    ).toBe("unavailable");
    expect(classifyTrackingFreshness(undefined, now)).toBe("unavailable");
  });

  it("never reports a negative age for bounded clock skew", () => {
    expect(trackingAgeSeconds(new Date("2026-10-02T12:01:00.000Z"), now)).toBe(
      0,
    );
    expect(trackingAgeSeconds(null, now)).toBeNull();
  });
});
