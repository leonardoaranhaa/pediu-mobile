import { useEffect, useRef } from "react";
import { Platform, Vibration } from "react-native";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export function StoreOrderAlarm() {
  const { user } = useAuth();
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 8_000,
  });
  const pending = (orders.data ?? []).some((order) => order.status === "Pendente");
  const player = useAudioPlayer(require("../assets/sounds/new-order.wav"));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (!pending) {
      player.pause();
      return;
    }
    const ring = () => {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // The alert still vibrates when the sound cannot start.
      }
      if (Platform.OS === "web") Vibration.vibrate?.(400);
      else {
        Vibration.vibrate(400);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    ring();
    timer.current = setInterval(ring, 4_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pending, player]);

  return null;
}
