import { useEffect, type PropsWithChildren, type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type PediuMotionVariant = "fadeUp" | "scaleIn" | "slideUp";

type MotionProps = PropsWithChildren<{
  delay?: number;
  duration?: number;
  enabled?: boolean;
  variant?: PediuMotionVariant;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Entrada curta inspirada no fade-up/stagger do Pediu3, mas executada no
 * thread nativo e desativável pelas preferências de movimento do Pediu.
 */
export function PediuReveal({
  children,
  delay = 0,
  duration = 420,
  enabled = true,
  variant = "fadeUp",
  style,
}: MotionProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion || !enabled ? 1 : 0);

  useEffect(() => {
    progress.value =
      reducedMotion || !enabled
        ? 1
        : withDelay(
            delay,
            withTiming(1, {
              duration,
              easing: Easing.out(Easing.cubic),
            }),
          );
  }, [delay, duration, enabled, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY =
      variant === "scaleIn" ? 0 : variant === "slideUp" ? 16 : 12;
    return {
      opacity: progress.value,
      transform: [
        { translateY: (1 - progress.value) * translateY },
        { scale: variant === "scaleIn" ? 0.96 + progress.value * 0.04 : 1 },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

type PressableMotionProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  disabled?: boolean;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

/** Press state único para botões, cards, chips e linhas operacionais. */
export function PediuPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.975,
  style,
  ...props
}: PressableMotionProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!reducedMotion && !disabled) {
            scale.value = withTiming(pressedScale, { duration: 90 });
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reducedMotion) scale.value = withTiming(1, { duration: 180 });
          onPressOut?.(event);
        }}
        style={style}
      >
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Movimento ambiente discreto para radar, badges e elementos decorativos. */
export function PediuFloating({
  children,
  enabled = true,
  distance = 6,
  duration = 1800,
  style,
}: PropsWithChildren<{
  enabled?: boolean;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || !enabled) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(-distance, {
          duration,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [distance, duration, enabled, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value }],
  }));
  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

/** Pulso controlado para contadores, badges e pontos de disponibilidade. */
export function PediuPulse({
  children,
  enabled = true,
  style,
}: PropsWithChildren<{
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion || !enabled) {
      progress.value = 1;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [enabled, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
  }));
  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
