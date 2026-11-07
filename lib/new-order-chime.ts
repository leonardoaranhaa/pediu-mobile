import { useEffect, useRef } from "react";
import { Vibration } from "react-native";
import * as Haptics from "expo-haptics";

/** Rings only when a new pending order appears while this screen is open. */
export function useNewOrderChime(pendingCount: number) {
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (previous.current !== null && pendingCount > previous.current) {
      Vibration.vibrate([0, 220, 120, 220]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    previous.current = pendingCount;
  }, [pendingCount]);
}
