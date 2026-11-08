import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AccessibilityInfo,
  Animated,
  Appearance,
  StyleSheet,
  View,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

const APPEARANCE_STORAGE_KEY = "pediu:appearance-mode";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [motionReduced, setMotionReduced] = useState(false);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "light" || stored === "dark") {
          setColorSchemeState(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled?.().then((enabled) => {
      if (active) setMotionReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setMotionReduced,
    );
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      if (scheme === colorScheme) return;
      setColorSchemeState(scheme);
      void AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, scheme);

      if (reducedMotion || motionReduced) {
        transitionOpacity.stopAnimation();
        transitionOpacity.setValue(0);
        return;
      }

      transitionOpacity.stopAnimation();
      transitionOpacity.setValue(0.2);
      Animated.timing(transitionOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    },
    [colorScheme, motionReduced, reducedMotion, transitionOpacity],
  );

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, themeVariables]}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.transitionOverlay,
            {
              backgroundColor: SchemeColors[colorScheme].background,
              opacity: transitionOpacity,
            },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
