import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

export function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          backgroundColor: PEDIU_TOKENS.line,
          borderRadius: PEDIU_TOKENS.radius.md,
        },
        style,
        animated,
      ]}
    />
  );
}

export function HomeSkeleton() {
  return (
    <View style={{ gap: 14 }} accessibilityLabel="Carregando lojas" accessibilityRole="progressbar">
      <SkeletonBlock style={{ height: 148, borderRadius: 22 }} />
      <SkeletonBlock style={{ height: 22, width: 180, borderRadius: 8 }} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <SkeletonBlock style={{ flex: 1, height: 108, borderRadius: 16 }} />
        <SkeletonBlock style={{ width: 60, height: 108, borderRadius: 16 }} />
      </View>
      <SkeletonBlock style={{ height: 22, width: 90, borderRadius: 8 }} />
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <SkeletonBlock style={{ width: 56, height: 56, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock style={{ height: 14, width: "70%", borderRadius: 6 }} />
            <SkeletonBlock style={{ height: 12, width: "45%", borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
