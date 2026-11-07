import { describe, expect, it } from "vitest";
import { ONBOARDING_SLIDES } from "../lib/onboarding-content";

describe("Pediu onboarding content", () => {
  it("keeps four swipeable product stories in the intended order", () => {
    expect(ONBOARDING_SLIDES.map((slide) => slide.id)).toEqual([
      "peca",
      "acompanhe",
      "venda",
      "seu-pediu",
    ]);
  });

  it("gives every slide a mascot reaction and accessible speech", () => {
    for (const slide of ONBOARDING_SLIDES) {
      expect(slide.eyebrow.length).toBeGreaterThan(0);
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.body.length).toBeGreaterThan(0);
      expect(slide.speech.length).toBeGreaterThan(0);
    }
  });
});
