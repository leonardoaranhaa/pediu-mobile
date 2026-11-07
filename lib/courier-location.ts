export type CourierFix = { latitude: number; longitude: number };

export async function readPositionWithFallback(readers: {
  lastKnown: () => Promise<CourierFix | null>;
  current: (accuracy: "balanced" | "low") => Promise<CourierFix>;
}): Promise<CourierFix | null> {
  try {
    return await readers.current("balanced");
  } catch {
    // The precise reading failed. Try a coarser one before the last saved point.
  }
  try {
    return await readers.current("low");
  } catch {
    // No fresh reading. The last known point is the remaining option.
  }
  try {
    return await readers.lastKnown();
  } catch {
    return null;
  }
}
