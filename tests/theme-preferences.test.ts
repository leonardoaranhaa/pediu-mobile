import { describe, expect, it } from "vitest";
import {
  APP_THEMES,
  isAppThemeId,
  themeForMode,
} from "../lib/app-preferences-core";

describe("theme preferences", () => {
  it("keeps the three Pediu palettes available in light and dark modes", () => {
    expect(APP_THEMES.map((theme) => theme.id)).toEqual([
      "classic",
      "ocean",
      "sunset",
    ]);

    for (const theme of APP_THEMES) {
      const light = themeForMode(theme, "light");
      const dark = themeForMode(theme, "dark");
      expect(light.id).toBe(theme.id);
      expect(dark.id).toBe(theme.id);
      expect(dark.canvas).not.toBe(light.canvas);
      expect(dark.onDeep).toBeTruthy();
      expect(dark.deep).toBeTruthy();
    }
  });

  it("accepts only supported appearance palette identifiers", () => {
    expect(isAppThemeId("classic")).toBe(true);
    expect(isAppThemeId("ocean")).toBe(true);
    expect(isAppThemeId("sunset")).toBe(true);
    expect(isAppThemeId("dark")).toBe(false);
    expect(isAppThemeId(null)).toBe(false);
  });
});
