import type { MascotGesture, MascotReaction } from "@/lib/mascot-scenes";

/** Source drawing box. Width and height always scale together. */
export const MASCOT_VIEWBOX = { width: 88, height: 104 } as const;

/** The figure never rotates. Gestures change the face, not the pose angle. */
export const MASCOT_MAX_TILT_DEGREES = 0;

export function mascotBox(compact: boolean) {
  const height = compact ? 72 : 104;
  const width = Math.round(
    (height * MASCOT_VIEWBOX.width) / MASCOT_VIEWBOX.height,
  );
  return { width, height };
}

export type MascotExpression = {
  eyes: "open" | "closed" | "peek";
  mouth: "smile" | "open" | "small" | "flat";
  hands: boolean;
  brows: boolean;
  wave: boolean;
};

export function mascotExpression(
  reaction: MascotReaction,
  gesture: MascotGesture,
): MascotExpression {
  const hands = gesture === "coverEyes" || reaction === "avoid";
  const sleepy = reaction === "sleepy" || gesture === "sleep";
  const happy =
    reaction === "happy" || reaction === "celebrate" || reaction === "full";
  const eyes =
    hands || sleepy || happy
      ? "closed"
      : gesture === "peek" || reaction === "curious"
        ? "peek"
        : "open";
  const mouth = happy
    ? "smile"
    : reaction === "hungry" || gesture === "sniff"
      ? "open"
      : sleepy
        ? "flat"
        : reaction === "curious"
          ? "small"
          : "smile";
  return {
    eyes,
    mouth,
    hands,
    brows: !hands && (reaction === "hungry" || reaction === "curious"),
    wave: gesture === "wave" || gesture === "dance",
  };
}
