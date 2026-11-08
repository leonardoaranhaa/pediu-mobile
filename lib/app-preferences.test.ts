import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
} from "./app-preferences-core";

describe("app customization preferences", () => {
  it("keeps the complete default preference surface", () => {
    expect(DEFAULT_CUSTOMIZATION).toEqual({
      mascotStyle: "classic",
      mascotEnabled: true,
      motionEnabled: true,
      showHints: true,
      smartHomeEnabled: true,
      analyticsEnabled: true,
      locationEnabled: false,
      diagnosticsEnabled: false,
    });
  });

  it("rejects invalid values without disabling safe defaults", () => {
    expect(
      normalizeCustomization({
        mascotStyle: "unknown",
        mascotEnabled: "false",
        motionEnabled: false,
        smartHomeEnabled: false,
        locationEnabled: true,
        diagnosticsEnabled: true,
      }),
    ).toEqual({
      ...DEFAULT_CUSTOMIZATION,
      motionEnabled: false,
      smartHomeEnabled: false,
      locationEnabled: true,
      diagnosticsEnabled: true,
    });
  });
});
