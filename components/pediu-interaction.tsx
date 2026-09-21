import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, type StyleProp, type ViewStyle } from "react-native";

export function PressFeedback({ children, onPress, disabled = false, style }: { children: ReactNode; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (toValue: number) => Animated.spring(scale, { toValue, friction: 8, tension: 180, useNativeDriver: true }).start();
  return <Animated.View style={[style, { transform: [{ scale }] }]}>
    <Pressable disabled={disabled} onPressIn={() => press(0.97)} onPressOut={() => press(1)} onPress={onPress}>{children}</Pressable>
  </Animated.View>;
}

export function Stagger({ children, index = 0, step = 45 }: { children: ReactNode; index?: number; step?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay: index * step, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, delay: index * step, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [index, step, opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
