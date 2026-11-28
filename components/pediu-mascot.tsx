import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import {
  MascotFigure,
  mascotBox,
  mascotExpression,
} from "@/components/mascot-figure";
import {
  mascotReactionForPath,
  useAppPreferences,
  type AppMascotStyle,
  type AppTheme,
} from "@/lib/app-preferences";
import {
  AMBIENT_SCENES,
  sceneForReaction,
  type MascotReaction,
  type MascotScene,
} from "@/lib/mascot-scenes";

export { sceneForReaction } from "@/lib/mascot-scenes";
export type { MascotReaction } from "@/lib/mascot-scenes";

export function PediuMascot({
  theme,
  styleId = "classic",
  reaction,
  motionEnabled = true,
  compact = false,
  showSpeech = false,
  speechText,
  programmed = false,
  onPress,
  size,
}: {
  theme: AppTheme;
  styleId?: AppMascotStyle;
  reaction?: MascotReaction;
  motionEnabled?: boolean;
  compact?: boolean;
  showSpeech?: boolean;
  speechText?: string;
  programmed?: boolean;
  speechSide?: "left" | "right";
  onPress?: () => void;
  /** Figure height in dp. Overrides `compact`. */
  size?: number;
}) {
  const pathname = usePathname();
  const { mascotMoment } = useAppPreferences();
  const activeReaction =
    reaction ?? mascotMoment?.reaction ?? mascotReactionForPath(pathname);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scene, setScene] = useState<MascotScene>(() =>
    sceneForReaction(activeReaction),
  );
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const [blinking, setBlinking] = useState(false);
  const reducedMotion = useReducedMotion();
  const scripted =
    programmed && (activeReaction === "idle" || activeReaction === "hungry");
  const box = mascotBox(compact, size);
  const baseExpression = mascotExpression(scene.reaction, scene.gesture);
  // A quick blink now and then; closed or covered eyes stay as they are.
  const expression =
    blinking && baseExpression.eyes !== "closed" && !baseExpression.hands
      ? { ...baseExpression, eyes: "closed" as const }
      : baseExpression;
  const scarfColor =
    styleId === "ocean"
      ? "#7BDFF2"
      : styleId === "sunset"
        ? "#FFCB77"
        : theme.highlight;
  const speech = speechText ?? scene.line;

  useEffect(() => {
    setSceneIndex(0);
    setScene(sceneForReaction(activeReaction));
  }, [activeReaction]);

  useEffect(() => {
    if (!scripted || !motionEnabled) return;
    const timer = setTimeout(
      () => setSceneIndex((current) => (current + 1) % AMBIENT_SCENES.length),
      scene.duration,
    );
    return () => clearTimeout(timer);
  }, [motionEnabled, scene.duration, sceneIndex, scripted]);

  useEffect(() => {
    if (!scripted) return;
    setScene(AMBIENT_SCENES[sceneIndex] ?? sceneForReaction(activeReaction));
  }, [activeReaction, sceneIndex, scripted]);

  useEffect(() => {
    if (!motionEnabled || reducedMotion) return;
    let open: ReturnType<typeof setTimeout> | undefined;
    let next: ReturnType<typeof setTimeout>;
    const schedule = () => {
      next = setTimeout(() => {
        setBlinking(true);
        open = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, 2800 + Math.random() * 2600);
    };
    schedule();
    return () => {
      clearTimeout(next);
      if (open) clearTimeout(open);
      setBlinking(false);
    };
  }, [motionEnabled, reducedMotion]);

  const hopOnce = () => {
    if (!motionEnabled || reducedMotion) return;
    hop.stopAnimation();
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    bob.stopAnimation();
    bob.setValue(0);
    if (!motionEnabled || reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      bob.setValue(0);
    };
  }, [bob, motionEnabled, reducedMotion]);

  const figure = (
    <View style={[styles.slot, { width: box.width, height: box.height + 4 }]}>
      <Animated.View
        style={{
          width: box.width,
          height: box.height,
          transform: [
            {
              translateY: Animated.add(
                bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
                hop.interpolate({ inputRange: [0, 1], outputRange: [0, -box.height * 0.12] }),
              ),
            },
            { scaleY: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
        }}
      >
        <MascotFigure
          width={box.width}
          height={box.height}
          body={theme.primary}
          face={theme.highlight}
          ink={theme.ink}
          scarf={scarfColor}
          expression={expression}
        />
      </Animated.View>
    </View>
  );

  const content = (
    <View style={styles.wrap}>
      {showSpeech ? (
        <View
          style={[
            styles.speechBubble,
            { borderColor: theme.line, backgroundColor: theme.card },
          ]}
        >
          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            allowFontScaling={false}
            style={[styles.speechText, { color: theme.ink }]}
          >
            {speech}
          </Text>
        </View>
      ) : null}
      {figure}
    </View>
  );

  const accessibleLabel = `${speech}. Mascote do Pediu`;
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel}
      onPressIn={hopOnce}
      onPress={onPress}
      style={styles.wrap}
    >
      {content}
    </Pressable>
  );
}

export function MascotStatus({
  theme,
  reaction,
  compact = false,
}: {
  theme: AppTheme;
  reaction: MascotReaction;
  compact?: boolean;
}) {
  const scene = sceneForReaction(reaction);
  return (
    <View
      style={[
        styles.status,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          padding: compact ? 9 : 12,
        },
      ]}
    >
      <PediuMascot theme={theme} reaction={reaction} motionEnabled={false} compact />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.statusKicker, { color: theme.primary }]}>PEDIU</Text>
        <Text numberOfLines={3} style={[styles.statusText, { color: theme.ink }]}>
          {scene.line}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", flexShrink: 0, maxWidth: 280 },
  slot: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    flexShrink: 0,
  },
  speechBubble: {
    maxWidth: 240,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  speechText: { fontWeight: "800", fontSize: 13, lineHeight: 18, textAlign: "center" },
  status: {
    borderWidth: 1,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  statusKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  statusText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
});
