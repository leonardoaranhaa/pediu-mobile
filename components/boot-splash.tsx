import { useEffect, useRef, useState } from "react";
import { Image, Platform, StyleSheet, useWindowDimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

/** Same red and wordmark as the native splash, so the hand-off is invisible. */
export const BOOT_SPLASH_COLOR = PEDIU_TOKENS.primary;
/** The native splash draws the 1024px canvas at 200dp wide (app.config.ts `imageWidth`). */
const WORDMARK_BOX = 200;
const EXIT_MS = 600;

/**
 * Keeps the brand on screen while the app reads local state (fonts, first-run flag),
 * then leaves with a short reveal: the wordmark settles, a canvas-coloured circle
 * opens from the centre and the overlay fades into the first screen.
 *
 * The native splash is hidden only after this overlay has painted, and the static
 * web splash from `app/+html.tsx` is removed at the same moment, so there is never a
 * blank frame between them.
 */
export function BootSplash({ ready, canvas }: { ready: boolean; canvas: string }) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const exiting = useRef(false);
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  // Red copy of the wordmark that takes over while the cream circle opens behind it.
  const redLogo = useSharedValue(0);
  const reveal = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const hideNativeSplash = () => {
    void SplashScreen.hideAsync().catch(() => undefined);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.getElementById("pediu-boot")?.remove();
    }
  };

  useEffect(() => {
    if (!ready || exiting.current) return;
    exiting.current = true;
    if (reducedMotion) {
      overlayOpacity.value = withTiming(0, { duration: 160 });
      const timer = setTimeout(() => setGone(true), 180);
      return () => clearTimeout(timer);
    }
    const ease = Easing.out(Easing.cubic);
    logoScale.value = withSequence(
      withTiming(1.06, { duration: 180, easing: ease }),
      withDelay(80, withTiming(0.86, { duration: 200, easing: Easing.in(Easing.cubic) })),
    );
    reveal.value = withDelay(100, withTiming(1, { duration: 320, easing: ease }));
    redLogo.value = withDelay(70, withTiming(1, { duration: 120 }));
    logoOpacity.value = withDelay(280, withTiming(0, { duration: 180 }));
    overlayOpacity.value = withDelay(440, withTiming(0, { duration: 140 }));
    const timer = setTimeout(() => setGone(true), EXIT_MS + 40);
    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, overlayOpacity, ready, redLogo, reducedMotion, reveal]);

  // Circle big enough to cover the screen corners from the centre.
  const diameter = Math.ceil(Math.hypot(width || 390, height || 844)) + 8;
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reveal.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const redLogoStyle = useAnimatedStyle(() => ({ opacity: redLogo.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  if (gone) return null;
  return (
    <Animated.View
      pointerEvents={ready ? "none" : "auto"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={hideNativeSplash}
      style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}
    >
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.circle,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: canvas,
            left: ((width || 390) - diameter) / 2,
            top: ((height || 844) - diameter) / 2,
          },
          circleStyle,
        ]}
      />
      <Animated.View style={logoStyle}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={{ width: WORDMARK_BOX, height: WORDMARK_BOX }}
          resizeMode="contain"
        />
        <Animated.View style={[StyleSheet.absoluteFill, redLogoStyle]}>
          <Image
            source={require("../assets/images/splash-icon.png")}
            style={{ width: WORDMARK_BOX, height: WORDMARK_BOX, tintColor: BOOT_SPLASH_COLOR }}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 100,
    backgroundColor: BOOT_SPLASH_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
  },
});
