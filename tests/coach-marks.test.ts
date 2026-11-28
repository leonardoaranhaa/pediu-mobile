import { describe, expect, it } from "vitest";
import { overlaySize, placeTooltip, spotlightPath, spotlightRect, tourWasSeen } from "../lib/coach-marks";

const screen = { width: 390, height: 844 };
const tooltip = { left: 16, width: 358 };

describe("guided tour geometry", () => {
  it("opens the tooltip below a target near the top", () => {
    const place = placeTooltip({ x: 16, y: 20, width: 220, height: 48 }, screen, tooltip);
    expect(place.side).toBe("below");
    expect(place.top).toBe(20 + 48 + 14);
    expect(place.arrowX).toBe(16 + 110 - 16);
  });

  it("opens the tooltip above a target near the bottom", () => {
    const place = placeTooltip({ x: 196, y: 770, width: 80, height: 48 }, screen, tooltip);
    expect(place.side).toBe("above");
    expect(place.bottom).toBe(844 - 770 + 14);
  });

  it("keeps the arrow away from the tooltip's rounded corners", () => {
    expect(placeTooltip({ x: 0, y: 10, width: 10, height: 10 }, screen, tooltip).arrowX).toBe(28);
    expect(placeTooltip({ x: 380, y: 10, width: 10, height: 10 }, screen, tooltip).arrowX).toBe(358 - 28);
  });

  it("pads the highlight but keeps it on screen", () => {
    expect(spotlightRect({ x: 0, y: 0, width: 100, height: 40 }, screen)).toEqual({ x: 4, y: 4, width: 104, height: 44 });
    expect(spotlightRect({ x: 300, y: 800, width: 100, height: 60 }, screen)).toEqual({ x: 292, y: 792, width: 94, height: 48 });
  });

  it("draws the screen with a rounded hole for the even-odd fill", () => {
    const path = spotlightPath({ x: 10, y: 20, width: 100, height: 40 }, screen, 16);
    expect(path.startsWith("M0 0H390V844H0Z")).toBe(true);
    expect(path).toContain("M26 20H94A16 16 0 0 1 110 36");
    // A radius larger than the hole is clamped to a pill.
    expect(spotlightPath({ x: 0, y: 0, width: 60, height: 30 }, screen, 999)).toContain("A15 15");
  });

  it("remembers the tour only when a tip was on screen", () => {
    expect(tourWasSeen("completed")).toBe(true);
    expect(tourWasSeen("skipped")).toBe(true);
    expect(tourWasSeen("unavailable")).toBe(false);
  });

  it("dims under the navigation bar when the screen is taller than the window", () => {
    expect(overlaySize({ width: 412, height: 870 }, { width: 412, height: 915 })).toEqual({ width: 412, height: 915 });
    expect(overlaySize({ width: 390, height: 844 })).toEqual({ width: 390, height: 844 });
  });
});
