import { useEffect, useRef } from "react";
import { Animated, Easing, View, type ReactNode, type StyleProp, type ViewStyle } from "react-native";

export function FadeIn({ children, delay = 0, duration = 280, style }: { children: ReactNode; delay?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, duration, opacity, translateY]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function PressScale({ children, scale = 0.985, style, onPress }: { children: ReactNode; scale?: number; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const value = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(value, { toValue, friction: 7, tension: 140, useNativeDriver: true }).start();
  return <Animated.View style={[style, { transform: [{ scale: value }] }]} onTouchStart={() => animate(scale)} onTouchEnd={() => { animate(1); onPress?.(); }}>{children}</Animated.View>;
}

export function Pulse({ children, active = true, style }: { children: ReactNode; active?: boolean; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (!active) { opacity.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export function Skeleton({ width = "100%", height = 16, radius = 10, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <Pulse style={[{ width, height, borderRadius: radius, backgroundColor: "#EDE5DE" }, style]}>{null}</Pulse>;
}

export function ScreenReveal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={style}><FadeIn>{children}</FadeIn></View>;
}
