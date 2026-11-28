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
    <View style={{ gap: 12 }}>
      <SkeletonBlock style={{ height: 64, borderRadius: 20 }} />
      <SkeletonBlock style={{ height: 56, borderRadius: 28 }} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <SkeletonBlock style={{ width: 84, height: 96, borderRadius: 18 }} />
        <SkeletonBlock style={{ width: 84, height: 96, borderRadius: 18 }} />
        <SkeletonBlock style={{ width: 84, height: 96, borderRadius: 18 }} />
      </View>
      <SkeletonBlock style={{ height: 108, borderRadius: 20 }} />
      <SkeletonBlock style={{ height: 108, borderRadius: 20 }} />
    </View>
  );
}
