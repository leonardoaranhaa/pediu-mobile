/** Space under a floating tab bar, including the system bar. */
export function bottomSafeInset(inset: number, os: string) {
  const minimum = os === "android" ? 48 : 12;
  return Math.max(0, inset, minimum);
}

export function scrollPaddingForFloatingBar(inset: number, os: string) {
  return 120 + bottomSafeInset(inset, os) + 36;
}

export function scrollPaddingForScreenEnd(inset: number, os: string) {
  return 28 + bottomSafeInset(inset, os);
}
