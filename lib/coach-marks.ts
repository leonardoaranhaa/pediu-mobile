import { useCallback, useEffect, useRef } from "react";
import type { View } from "react-native";

/**
 * Screen elements a guided tour can point at. A component marks itself with
 * `useCoachTarget("home.search")`; the tour asks for its position only when the
 * step is shown, so nothing is measured while no tour is running.
 */
export type CoachRect = { x: number; y: number; width: number; height: number };

const targets = new Map<string, () => Promise<CoachRect | null>>();

export function registerCoachTarget(id: string, measure: () => Promise<CoachRect | null>) {
  targets.set(id, measure);
  return () => {
    if (targets.get(id) === measure) targets.delete(id);
  };
}

export async function measureCoachTarget(id: string): Promise<CoachRect | null> {
  const measure = targets.get(id);
  if (!measure) return null;
  try {
    return await measure();
  } catch {
    return null;
  }
}

export function hasCoachTarget(id: string) {
  return targets.has(id);
}

/** Ref to put on the element a tour step points at. */
export function useCoachTarget(id: string) {
  const ref = useRef<View>(null);
  const measure = useCallback(
    () =>
      new Promise<CoachRect | null>((resolve) => {
        const node = ref.current;
        if (!node?.measureInWindow) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
        });
      }),
    [],
  );
  useEffect(() => registerCoachTarget(id, measure), [id, measure]);
  return ref;
}

/**
 * How a tour ended. "unavailable" means no step could be shown (nothing to point
 * at on screen), so the person has not seen the tour yet.
 */
export type TourOutcome = "completed" | "skipped" | "unavailable";

/** Remember a tour as seen only if at least one tip was actually on screen. */
export function tourWasSeen(outcome: TourOutcome) {
  return outcome !== "unavailable";
}

export type TooltipPlacement = {
  side: "above" | "below";
  top?: number;
  bottom?: number;
  arrowX: number;
};

/**
 * Puts the tooltip on the side of the target with more room and points the arrow
 * at the target's centre, kept away from the tooltip's rounded corners.
 */
export function placeTooltip(
  target: CoachRect,
  screen: { width: number; height: number },
  tooltip: { left: number; width: number },
  gap = 14,
): TooltipPlacement {
  const centerX = target.x + target.width / 2;
  const arrowX = Math.min(
    Math.max(centerX - tooltip.left, 28),
    tooltip.width - 28,
  );
  const roomAbove = target.y;
  const roomBelow = screen.height - (target.y + target.height);
  if (roomBelow >= roomAbove) {
    return { side: "below", top: target.y + target.height + gap, arrowX };
  }
  return { side: "above", bottom: screen.height - target.y + gap, arrowX };
}

/**
 * Area to dim. On Android the tour's modal also draws under a translucent
 * navigation bar, which the window size can leave out, so take the larger of
 * window and screen; positions still come from the window.
 */
export function overlaySize(
  window: { width: number; height: number },
  screen: { width: number; height: number } = window,
) {
  return { width: Math.max(window.width, screen.width), height: Math.max(window.height, screen.height) };
}

/** Hole around the target, padded and kept inside the screen. */
export function spotlightRect(target: CoachRect, screen: { width: number; height: number }, pad = 8): CoachRect {
  const x = Math.max(4, target.x - pad);
  const y = Math.max(4, target.y - pad);
  const right = Math.min(screen.width - 4, target.x + target.width + pad);
  const bottom = Math.min(screen.height - 4, target.y + target.height + pad);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/** SVG path: the whole screen minus a rounded hole (even-odd fill). */
export function spotlightPath(hole: CoachRect, screen: { width: number; height: number }, radius = 16) {
  const r = Math.min(radius, hole.width / 2, hole.height / 2);
  const { x, y, width: w, height: h } = hole;
  return [
    `M0 0H${screen.width}V${screen.height}H0Z`,
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
  ].join("");
}
