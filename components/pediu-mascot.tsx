import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppMascotStyle, AppTheme } from "@/lib/app-preferences";

export type MascotReaction = "idle" | "hungry" | "happy" | "full" | "sleepy" | "avoid" | "curious" | "celebrate";
type MascotGesture = "stand" | "lie" | "coverEyes" | "sleep" | "peek" | "wave" | "belly" | "sniff" | "dance";
type MascotScene = { id: string; reaction: MascotReaction; gesture: MascotGesture; line: string; duration: number };

const AMBIENT_SCENES: MascotScene[] = [
  { id: "hungry", reaction: "hungry", gesture: "lie", line: "Aí que fomeee… pede alguma coisinha pra gente comer. Snif, snif!", duration: 10_000 },
  { id: "sniff", reaction: "hungry", gesture: "sniff", line: "Snif, snif… senti um cheirinho de coisa gostosa por aqui.", duration: 8_500 },
  { id: "curious", reaction: "curious", gesture: "peek", line: "Será que vem um mimo por aí? Eu senti um cheirinho de coisa boa.", duration: 11_500 },
  { id: "stretch", reaction: "idle", gesture: "stand", line: "Estiquei as perninhas. Pronto para descobrir seu próximo pedido!", duration: 10_000 },
  { id: "sleepy", reaction: "sleepy", gesture: "sleep", line: "Só um cochilinho… me chama quando escolher o que vamos pedir.", duration: 12_000 },
  { id: "dance", reaction: "celebrate", gesture: "dance", line: "Estou dançando baixinho porque hoje tem coisa boa no ar!", duration: 9_000 },
  { id: "watching", reaction: "idle", gesture: "stand", line: "Estou de olho em tudo com carinho. Escolha no seu tempo.", duration: 13_000 },
];

function sceneById(id: string) {
  return AMBIENT_SCENES.find((scene) => scene.id === id) ?? AMBIENT_SCENES[0];
}

function sceneForReaction(reaction: MascotReaction): MascotScene {
  if (reaction === "hungry") return sceneById("hungry");
  if (reaction === "curious") return sceneById("curious");
  if (reaction === "sleepy") return sceneById("sleepy");
  if (reaction === "happy" || reaction === "celebrate") return { id: reaction, reaction, gesture: "wave", line: "Obaaa! Essa escolha deixou meu coração quentinho!", duration: 5_500 };
  if (reaction === "full") return { id: "full", reaction, gesture: "belly", line: "Agora sim… vou tirar um cochilo de barriga cheia.", duration: 10_000 };
  if (reaction === "avoid") return { id: "avoid", reaction, gesture: "coverEyes", line: "Não vou espiar nada, prometo. Privacidade é coisa séria!", duration: 8_000 };
  return { id: "idle", reaction: "idle", gesture: "stand", line: "Estou aqui com você. Vamos encontrar uma boa escolha?", duration: 8_000 };
}

export function PediuMascot({ theme, styleId = "classic", reaction = "idle", motionEnabled = true, compact = false, showSpeech = false, speechText, programmed = false, speechSide = "left", onPress }: { theme: AppTheme; styleId?: AppMascotStyle; reaction?: MascotReaction; motionEnabled?: boolean; compact?: boolean; showSpeech?: boolean; speechText?: string; programmed?: boolean; speechSide?: "left" | "right"; onPress?: () => void }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scene, setScene] = useState<MascotScene>(() => sceneForReaction(reaction));
  const bob = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;
  const sceneProgress = useRef(new Animated.Value(1)).current;
  const handsProgress = useRef(new Animated.Value(reaction === "avoid" ? 1 : 0)).current;
  const scripted = programmed && (reaction === "idle" || reaction === "hungry");

  useEffect(() => {
    setSceneIndex(0);
    setScene(sceneForReaction(reaction));
  }, [reaction]);

  useEffect(() => {
    if (!scripted || !motionEnabled) return;
    const timer = setTimeout(() => setSceneIndex((current) => (current + 1) % AMBIENT_SCENES.length), scene.duration);
    return () => clearTimeout(timer);
  }, [motionEnabled, scene.duration, sceneIndex, scripted]);

  useEffect(() => {
    if (!scripted) return;
    setScene(AMBIENT_SCENES[sceneIndex]);
  }, [sceneIndex, scripted]);

  useEffect(() => {
    sceneProgress.setValue(0);
    Animated.timing(sceneProgress, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(handsProgress, { toValue: scene.gesture === "coverEyes" ? 1 : 0, duration: 520, easing: Easing.out(Easing.back(1.15)), useNativeDriver: true }).start();
  }, [handsProgress, scene.gesture, scene.id, sceneProgress]);

  useEffect(() => {
    if (!motionEnabled) {
      bob.stopAnimation();
      wiggle.stopAnimation();
      bob.setValue(0);
      wiggle.setValue(0);
      return;
    }
    const bobDuration = scene.gesture === "sleep" ? 2100 : scene.gesture === "lie" || scene.gesture === "sniff" ? 1500 : 2400;
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: bobDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: bobDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const wiggleDuration = scene.reaction === "happy" || scene.reaction === "celebrate" ? 480 : 800;
    const wiggleLoop = Animated.loop(Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: wiggleDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: wiggleDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]));
    bobLoop.start();
    if (scene.gesture === "wave" || scene.gesture === "peek" || scene.gesture === "sniff" || scene.gesture === "dance") wiggleLoop.start();
    return () => { bobLoop.stop(); wiggleLoop.stop(); };
  }, [bob, motionEnabled, scene.gesture, scene.reaction, wiggle]);

  useEffect(() => {
    if (!motionEnabled) {
      blink.stopAnimation();
      blink.setValue(0);
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 1, duration: 130, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(blink, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        ]).start(() => { if (active) scheduleBlink(); });
      }, 5_200);
    };
    scheduleBlink();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      blink.stopAnimation();
    };
  }, [blink, motionEnabled]);

  const size = compact ? 72 : 104;
  const bodySize = compact ? 54 : 76;
  const faceSize = compact ? 43 : 60;
  const happy = scene.reaction === "happy" || scene.reaction === "celebrate";
  const sleepy = scene.reaction === "sleepy";
  const coverEyes = scene.gesture === "coverEyes";
  const eyesClosed = happy || sleepy || coverEyes;
  const scarfColor = styleId === "ocean" ? "#7BDFF2" : styleId === "sunset" ? "#FFCB77" : theme.highlight;
  const accentIcon = styleId === "ocean" ? "water-drop" : styleId === "sunset" ? "wb-sunny" : "favorite";
  const speech = speechText ?? scene.line;
  const bodyRotation = scene.gesture === "lie" ? "-70deg" : scene.gesture === "sleep" ? "5deg" : scene.gesture === "dance" ? "-4deg" : "0deg";
  const bubblePosition = speechSide === "right" ? { left: compact ? 34 : 76 } : { right: compact ? 34 : 8 };
  const bubbleTailStyle = speechSide === "right" ? styles.speechTailLeft : styles.speechTail;
  const eyeWidth = compact ? (eyesClosed ? 8 : 5) : (eyesClosed ? 11 : 6);
  const eyeHeight = eyesClosed ? (compact ? 3 : 4) : blink.interpolate({ inputRange: [0, 1], outputRange: [compact ? 7 : 9, 2] });
  const mouth = happy ? "⌣" : scene.reaction === "full" ? "◡" : scene.reaction === "hungry" ? "◡" : sleepy ? "﹏" : scene.reaction === "curious" ? "o" : scene.reaction === "avoid" ? "—" : "•";
  const content = <Animated.View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "visible", transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, scene.gesture === "lie" ? 2 : happy ? -5 : -2] }) }, { scale: sceneProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, happy ? 1.04 : 1] }) }] }}>
    {showSpeech ? <Animated.View pointerEvents="none" style={[styles.speechBubble, compact && styles.speechBubbleCompact, bubblePosition, { borderColor: theme.line, backgroundColor: theme.card, opacity: sceneProgress }]}><View style={[bubbleTailStyle, { backgroundColor: theme.card, borderColor: theme.line }]} /><Text numberOfLines={compact ? 3 : 4} ellipsizeMode="tail" style={[styles.speechText, { color: theme.ink, fontSize: compact ? 9 : 11, lineHeight: compact ? 13 : 15 }]}>{speech}</Text></Animated.View> : null}
    <Animated.View pointerEvents="none" style={[styles.sparkles, { opacity: sceneProgress, transform: [{ scale: sceneProgress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }] }]}><Text style={{ color: scarfColor, fontSize: compact ? 12 : 16 }}>✦</Text><Text style={{ color: theme.primary, fontSize: compact ? 9 : 12 }}>•</Text><Text style={{ color: theme.highlight, fontSize: compact ? 11 : 15 }}>✦</Text></Animated.View>
    <View style={[styles.antenna, { backgroundColor: scarfColor, width: compact ? 3 : 4, height: compact ? 13 : 18, top: compact ? 3 : 0 }]}><View style={[styles.antennaDot, { backgroundColor: theme.primary, width: compact ? 8 : 10, height: compact ? 8 : 10 }]} /></View>
    <Animated.View style={[styles.body, { width: bodySize, height: bodySize, borderRadius: bodySize / 2.5, backgroundColor: theme.primary, shadowColor: theme.primary, transform: [{ rotate: bodyRotation }, { rotate: wiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-2deg", "0deg", "2deg"] }) }] }] }>
      <View style={[styles.arm, styles.leftArm, { backgroundColor: theme.primary }]} /><View style={[styles.arm, styles.rightArm, { backgroundColor: theme.primary }]} />
      <View style={[styles.ear, styles.leftEar, { backgroundColor: theme.primary }]} /><View style={[styles.ear, styles.rightEar, { backgroundColor: theme.primary }]} />
      <View style={[styles.face, { width: faceSize, height: faceSize, borderRadius: faceSize / 2, backgroundColor: theme.highlight }]}>
        {(scene.reaction === "hungry" || scene.reaction === "curious") ? <View style={styles.browRow}><View style={[styles.brow, { backgroundColor: theme.ink }]} /><View style={[styles.brow, { backgroundColor: theme.ink }]} /></View> : null}
        <View style={styles.eyeRow}><Animated.View style={[styles.eye, { width: eyeWidth, height: eyeHeight, borderRadius: 6, backgroundColor: theme.ink }]} /><Animated.View style={[styles.eye, { width: eyeWidth, height: eyeHeight, borderRadius: 6, backgroundColor: theme.ink }]} /></View>
        <View style={styles.cheekRow}><View style={[styles.cheek, { backgroundColor: theme.primary }]} /><View style={[styles.cheek, { backgroundColor: theme.primary }]} /></View>
        <Text style={[styles.mouth, { color: theme.ink, fontSize: compact ? 16 : 21 }]}>{mouth}</Text>
      </View>
      {coverEyes ? <><Animated.View style={[styles.hand, styles.leftHand, { backgroundColor: theme.highlight, transform: [{ translateX: handsProgress.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }, { rotate: "-22deg" }] }]}><View style={[styles.finger, { backgroundColor: theme.primary }]} /></Animated.View><Animated.View style={[styles.hand, styles.rightHand, { backgroundColor: theme.highlight, transform: [{ translateX: handsProgress.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }, { rotate: "22deg" }] }]}><View style={[styles.finger, { backgroundColor: theme.primary }]} /></Animated.View></> : null}
      <View style={[styles.scarf, { backgroundColor: scarfColor, height: compact ? 8 : 11 }]}><Text style={[styles.scarfMark, { color: theme.ink, fontSize: compact ? 8 : 10 }]}>p</Text></View>
      {scene.gesture === "belly" ? <View style={[styles.belly, { borderColor: scarfColor }]}><MaterialIcons name="restaurant" size={compact ? 9 : 12} color={scarfColor} /></View> : null}
    </Animated.View>
    <View style={[styles.foot, styles.leftFoot, { backgroundColor: theme.ink, width: compact ? 18 : 25 }]} /><View style={[styles.foot, styles.rightFoot, { backgroundColor: theme.ink, width: compact ? 18 : 25 }]} />
    <View style={[styles.iconBadge, { backgroundColor: theme.ink, width: compact ? 19 : 25, height: compact ? 19 : 25, borderRadius: compact ? 10 : 13 }]}><MaterialIcons name={accentIcon} size={compact ? 10 : 13} color={scarfColor} /></View>
    {sleepy ? <Text style={[styles.sleepMark, { color: scarfColor, fontSize: compact ? 12 : 16 }]}>Zzz</Text> : null}
    {scene.gesture === "sniff" ? <Text style={[styles.sniffMark, { color: scarfColor, fontSize: compact ? 9 : 12 }]}>snif</Text> : null}
  </Animated.View>;

  const accessibleLabel = `${speech} ${coverEyes ? "Mascote cobrindo os olhos" : "Mascote do Pediu"}`;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={accessibleLabel} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] }]}>{content}</Pressable> : content;
}

export function MascotStatus({ theme, reaction, compact = false }: { theme: AppTheme; reaction: MascotReaction; compact?: boolean }) {
  const scene = sceneForReaction(reaction);
  return <View style={[styles.status, { backgroundColor: theme.card, borderColor: theme.line, padding: compact ? 9 : 12 }]}><PediuMascot theme={theme} reaction={reaction} motionEnabled compact /><View style={{ flex: 1, gap: 2 }}><Text style={[styles.statusKicker, { color: theme.primary }]}>PEDIU</Text><Text numberOfLines={3} style={[styles.statusText, { color: theme.ink }]}>{scene.line}</Text></View></View>;
}

const styles = StyleSheet.create({
  speechBubble: { position: "absolute", width: 176, minHeight: 34, borderWidth: 1, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 6, shadowColor: "#163B48", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4, zIndex: 10 },
  speechBubbleCompact: { width: 138, minHeight: 30, borderRadius: 11, paddingHorizontal: 7, paddingVertical: 5 },
  speechTail: { position: "absolute", right: -5, bottom: 10, width: 9, height: 9, transform: [{ rotate: "45deg" }], borderRightWidth: 1, borderBottomWidth: 1 },
  speechTailLeft: { position: "absolute", left: -5, bottom: 10, width: 9, height: 9, transform: [{ rotate: "45deg" }], borderLeftWidth: 1, borderBottomWidth: 1 },
  speechText: { fontWeight: "800", flexShrink: 1 },
  antenna: { position: "absolute", alignItems: "center", justifyContent: "flex-start", borderRadius: 5, zIndex: 2 },
  antennaDot: { borderRadius: 999, position: "absolute", top: -4 },
  body: { alignItems: "center", justifyContent: "center", shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5, position: "relative", overflow: "visible" },
  arm: { position: "absolute", width: 11, height: 25, borderRadius: 10, top: 27, zIndex: 1 },
  leftArm: { left: -5, transform: [{ rotate: "25deg" }] },
  rightArm: { right: -5, transform: [{ rotate: "-25deg" }] },
  ear: { width: 17, height: 21, borderRadius: 10, position: "absolute", top: 10 },
  leftEar: { left: -6, transform: [{ rotate: "-25deg" }] },
  rightEar: { right: -6, transform: [{ rotate: "25deg" }] },
  face: { alignItems: "center", justifyContent: "center", gap: 1, zIndex: 2 },
  browRow: { flexDirection: "row", gap: 13, height: 5, alignItems: "center" },
  brow: { width: 10, height: 2, borderRadius: 4, transform: [{ rotate: "-8deg" }] },
  eyeRow: { flexDirection: "row", gap: 13, alignItems: "center", minHeight: 9 },
  eye: { minWidth: 3 },
  cheekRow: { position: "absolute", left: 8, right: 8, top: 31, flexDirection: "row", justifyContent: "space-between", opacity: 0.28 },
  cheek: { width: 7, height: 3, borderRadius: 4 },
  mouth: { fontWeight: "900", lineHeight: 21 },
  hand: { position: "absolute", top: 18, width: 13, height: 25, borderRadius: 9, zIndex: 4, alignItems: "center", justifyContent: "center" },
  leftHand: { left: 13 },
  rightHand: { right: 13 },
  finger: { width: 3, height: 13, borderRadius: 3, opacity: 0.5 },
  scarf: { position: "absolute", bottom: 10, left: 7, right: 7, borderRadius: 8, alignItems: "center", justifyContent: "center", zIndex: 5 },
  scarfMark: { fontWeight: "900", fontStyle: "italic" },
  belly: { position: "absolute", bottom: 16, width: 22, height: 16, borderWidth: 1.5, borderRadius: 12, alignItems: "center", justifyContent: "center", zIndex: 4 },
  foot: { height: 7, borderRadius: 5, position: "absolute", bottom: 5 },
  leftFoot: { marginLeft: -22, transform: [{ rotate: "-10deg" }] },
  rightFoot: { marginLeft: 22, transform: [{ rotate: "10deg" }] },
  sparkles: { position: "absolute", top: -2, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between", zIndex: 3 },
  iconBadge: { position: "absolute", right: 4, bottom: 9, alignItems: "center", justifyContent: "center" },
  sleepMark: { position: "absolute", right: 0, top: -1, fontWeight: "900", fontStyle: "italic" },
  sniffMark: { position: "absolute", left: -3, top: 24, fontWeight: "900", fontStyle: "italic" },
  status: { borderWidth: 1, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 9 },
  statusKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  statusText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
});
