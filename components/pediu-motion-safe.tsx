import { useEffect, useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

export function MotionReveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted) return;
      if (reduce) {
        opacity.setValue(1);
        y.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 240, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 240, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
    return () => { mounted = false; };
  }, [delay, opacity, y]);
  return <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}
