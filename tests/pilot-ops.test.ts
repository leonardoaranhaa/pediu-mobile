import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  courierEarning,
  deliveryCodesMatch,
  ignoreEmptyPriceBand,
  parseOptionalPrice,
  resolveStoreAvailability,
} from "../shared/pilot-ops";

describe("pilot operations", () => {
  it("ignores an empty price field and a 0–0 band", () => {
    expect(parseOptionalPrice("")).toBeUndefined();
    expect(parseOptionalPrice("  ")).toBeUndefined();
    expect(parseOptionalPrice("12,5")).toBe(12.5);
    expect(ignoreEmptyPriceBand(0, 0)).toEqual({
      minPrice: undefined,
      maxPrice: undefined,
    });
    expect(ignoreEmptyPriceBand(10, 40)).toEqual({ minPrice: 10, maxPrice: 40 });
  });

  it("keeps a closed store visible with the next opening time", () => {
    const hours = JSON.stringify({
      "0": { open: "11:00", close: "23:00", closed: true },
      "1": { open: "11:00", close: "23:00", closed: false },
    });
    const sunday = resolveStoreAvailability({
      isOpen: 1,
      openingHours: hours,
      now: new Date("2026-10-18T15:00:00"),
    });
    expect(sunday.open).toBe(false);
    expect(sunday.nextOpenLabel).toBe("Abre amanhã às 11:00");
    expect(
      resolveStoreAvailability({
        isOpen: 1,
        openingHours: hours,
        now: new Date("2026-10-19T12:00:00"),
      }).open,
    ).toBe(true);
  });

  it("pays the courier the delivery fee plus tip, not the order total", () => {
    expect(courierEarning("6.50", "2.00")).toBe(8.5);
    expect(courierEarning(null, undefined)).toBe(0);
  });

  it("accepts a delivery only when the customer code matches", () => {
    expect(deliveryCodesMatch(null, "")).toBe(true);
    expect(deliveryCodesMatch("1234", "1234")).toBe(true);
    expect(deliveryCodesMatch("1234", "0000")).toBe(false);
  });

  it("counts down an offer that is about to expire", () => {
    const now = new Date("2026-10-18T12:00:00");
    expect(countdownLabel(new Date("2026-10-18T12:01:05"), now)).toBe("1:05");
    expect(countdownLabel(new Date("2026-10-18T11:59:00"), now)).toBe("0:00");
  });
});
