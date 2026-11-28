import { useCallback, useEffect, useState } from "react";
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Pop } from "@/components/onboarding-stages";
import { PediuMascot } from "@/components/pediu-mascot";
import { useAppPreferences } from "@/lib/app-preferences";
import {
  measureCoachTarget,
  overlaySize,
  placeTooltip,
  spotlightPath,
  spotlightRect,
  type CoachRect,
  type TourOutcome,
} from "@/lib/coach-marks";
import type { MascotReaction } from "@/lib/mascot-scenes";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

export type CoachStep = {
  /** Id given to `useCoachTarget` on the element to highlight. */
  target: string;
  title: string;
  body: string;
  reaction?: MascotReaction;
  /** Corner radius of the highlight; use a large value for round targets. */
  radius?: number;
  padding?: number;
};

const DIM = "rgba(17, 12, 8, 0.72)";
const SIDE = 16;

function PulseRing({ rect, radius }: { rect: CoachRect; radius: number }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, [pulse, reduced]);
  const animated = useAnimatedStyle(() => ({
    opacity: 0.9 - pulse.value * 0.9,
    transform: [{ scaleX: 1 + (pulse.value * 12) / Math.max(rect.width, 1) }, { scaleY: 1 + (pulse.value * 12) / Math.max(rect.height, 1) }],
  }));
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.ring, { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderRadius: radius }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderRadius: radius }, animated]}
      />
    </>
  );
}

/**
 * Guided tour over the current screen: dims everything except one element at a time
 * and explains it in a speech card from the mascot. Steps whose element is not on
 * screen are skipped. `onClose` says whether the person finished, skipped, or saw nothing.
 */
export function CoachMarkTour({
  steps,
  visible,
  onClose,
  finishLabel = "Concluir",
}: {
  steps: CoachStep[];
  visible: boolean;
  onClose: (outcome: TourOutcome) => void;
  finishLabel?: string;
}) {
  const { theme, customization } = useAppPreferences();
  const { width, height } = useWindowDimensions();
  const [available, setAvailable] = useState<CoachStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<CoachRect | null>(null);

  const onScreen = useCallback(
    (measured: CoachRect | null): measured is CoachRect =>
      Boolean(measured && measured.y + measured.height > 0 && measured.y < height && measured.x < width),
    [height, width],
  );

  // When the tour opens, keep only the steps whose element is on screen,
  // so the counter matches what the person will actually see.
  useEffect(() => {
    if (!visible) {
      setRect(null);
      setAvailable([]);
      return;
    }
    let active = true;
    void (async () => {
      const found: { step: CoachStep; rect: CoachRect }[] = [];
      for (const step of steps) {
        const measured = await measureCoachTarget(step.target);
        if (onScreen(measured)) found.push({ step, rect: measured });
      }
      if (!active) return;
      if (!found.length) {
        onClose("unavailable");
        return;
      }
      setAvailable(found.map((item) => item.step));
      setIndex(0);
      setRect(found[0].rect);
    })();
    return () => {
      active = false;
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback(
    async (next: number) => {
      const measured = await measureCoachTarget(available[next]?.target ?? "");
      if (!onScreen(measured)) {
        if (next + 1 < available.length) return goTo(next + 1);
        onClose("completed");
        return;
      }
      setIndex(next);
      setRect(measured);
    },
    [available, onClose, onScreen],
  );

  if (!visible || !rect || !available[index]) return null;
  const step = available[index];
  const radius = step.radius ?? 16;
  const hole = spotlightRect(rect, { width, height }, step.padding ?? 8);
  const tooltip = { left: SIDE, width: Math.min(width - SIDE * 2, 420) };
  const dim = overlaySize({ width, height }, Platform.OS === "android" ? Dimensions.get("screen") : undefined);
  const place = placeTooltip(hole, { width, height }, tooltip);
  const total = available.length;
  const isLast = index === available.length - 1;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => onClose("skipped")}
    >
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Svg width={dim.width} height={dim.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={spotlightPath(hole, dim, radius)} fill={DIM} fillRule="evenodd" />
        </Svg>
        <PulseRing rect={hole} radius={Math.min(radius, hole.width / 2, hole.height / 2)} />
        <Pop
          key={`${index}-${hole.x}-${hole.y}`}
          from={0.92}
          style={{ position: "absolute", left: tooltip.left, width: tooltip.width, top: place.top, bottom: place.bottom }}
        >
          <View style={styles.card} accessibilityLiveRegion="polite">
            <View
              style={[
                styles.arrow,
                { left: place.arrowX - 9 },
                place.side === "below" ? { top: -8 } : { bottom: -8 },
              ]}
            />
            <View style={styles.row}>
              <View style={styles.avatar}>
                <PediuMascot
                  theme={theme}
                  styleId={customization.mascotStyle}
                  reaction={step.reaction ?? "happy"}
                  motionEnabled={customization.motionEnabled}
                  size={54}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={[styles.kicker, { color: theme.primary }]}>
                  {`DICA ${index + 1} DE ${total}`}
                </Text>
                <Text style={styles.title} accessibilityRole="header">
                  {step.title}
                </Text>
                <Text style={styles.body}>{step.body}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.dots}>
                {available.map((item, i) => (
                  <View
                    key={item.target}
                    style={[styles.dot, i === index && { width: 18, backgroundColor: theme.primary }]}
                  />
                ))}
              </View>
              {!isLast ? (
                <Pressable onPress={() => onClose("skipped")} accessibilityRole="button" hitSlop={8} style={styles.skip}>
                  <Text style={styles.skipText}>Pular</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => (isLast ? onClose("completed") : void goTo(index + 1))}
                accessibilityRole="button"
                style={[styles.next, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.nextText}>{isLast ? finishLabel : "Próximo"}</Text>
              </Pressable>
            </View>
          </View>
        </Pop>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    gap: 14,
    ...Platform.select({
      web: { boxShadow: "0 14px 32px rgba(0,0,0,0.28)" } as object,
      default: {
        shadowColor: "#000000",
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      },
    }),
  },
  arrow: {
    position: "absolute",
    width: 18,
    height: 18,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    borderRadius: 3,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PEDIU_TOKENS.canvasDeep,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  kicker: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontFamily: PEDIU_TOKENS.fontDisplay, fontSize: 19, lineHeight: 23, fontWeight: "600", color: PEDIU_TOKENS.text },
  body: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 14, lineHeight: 20, color: PEDIU_TOKENS.muted },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  dots: { flex: 1, flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PEDIU_TOKENS.line },
  skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  skipText: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 15, fontWeight: "800", color: PEDIU_TOKENS.muted },
  next: { minHeight: 44, borderRadius: 999, paddingHorizontal: 20, justifyContent: "center" },
  nextText: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
});
