const ANDROID_UNREPORTED_NAV = 48;
const ANDROID_GAP = 16;
const OTHER_GAP = 8;

/**
 * Space between the screen edge and a floating control.
 * Uses the real system inset, with a 3-button fallback when Android reports none,
 * plus a gap so the control does not sit on the system buttons.
 */
export function bottomSafeInset(inset: number, os: string) {
  const reported = Number.isFinite(inset) ? Math.max(0, inset) : 0;
  const system =
    os === "android" && reported < 16 ? ANDROID_UNREPORTED_NAV : reported;
  const gap = os === "android" ? ANDROID_GAP : OTHER_GAP;
  return system + gap;
}

export function scrollPaddingForFloatingBar(inset: number, os: string) {
  return 120 + bottomSafeInset(inset, os) + 36;
}

export function scrollPaddingForScreenEnd(inset: number, os: string) {
  return 28 + bottomSafeInset(inset, os);
}
