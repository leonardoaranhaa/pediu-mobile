import { describe, expect, it } from "vitest";

import { mascotReactionForPath, sceneForReaction } from "../lib/mascot-scenes";

describe("Pediu mascot behavior", () => {
  it("uses the cover-eyes gesture for privacy routes", () => {
    const scene = sceneForReaction("avoid");

    expect(scene.gesture).toBe("coverEyes");
    expect(scene.line).toContain("Privacidade");
  });

  it("keeps a deliberate gesture for the order completion scene", () => {
    const scene = sceneForReaction("full");

    expect(scene.gesture).toBe("belly");
    expect(scene.duration).toBeGreaterThanOrEqual(7_000);
  });

  it.each([
    ["/account/settings", "avoid"],
    ["/account/profile", "avoid"],
    ["/cart", "happy"],
    ["/checkout", "happy"],
    ["/order/track", "curious"],
    ["/", "hungry"],
  ] as const)("maps %s to the %s reaction", (pathname, reaction) => {
    expect(mascotReactionForPath(pathname)).toBe(reaction);
  });
});
