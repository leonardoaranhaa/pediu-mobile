import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppMascotStyle, AppTheme } from "@/lib/app-preferences";

export type MascotReaction = "idle" | "hungry" | "happy" | "full" | "sleepy" | "avoid" | "curious" | "celebrate";
type MascotGesture = "stand" | "lie" | "coverEyes" | "sleep" | "peek" | "wave" | "belly" | "sniff" | "dance";
type MascotScene = { id: string; reaction: MascotReaction; gesture: MascotGesture; line: string; duration: number };

const AMBIENT_SCENES: MascotScene[] = [
  { id: "hungry", reaction: "hungry", gesture: "lie", line: "Aí que fomeee… pede alguma coisinha pra gente comer. Snif, snif!", duration: 4600 },
  { id: "sniff", reaction: "hungry", gesture: "sniff", line: "Snif, snif… senti um cheirinho de coisa gostosa por aqui.", duration: 3900 },
  { id: "curious", reaction: "curious", gesture: "peek", line: "Será que vem um mimo por aí? Eu senti um cheirinho de coisa boa.", duration: 4200 },
  { id: "stretch", reaction: "idle", gesture: "stand", line: "Estiquei as perninhas. Pronto para descobrir seu próximo pedido!", duration: 4100 },
  { id: "sleepy", reaction: "sleepy", gesture: "sleep", line: "Só um cochilinho… me chama quando escolher o que vamos pedir.", duration: 4300 },
  { id: "dance", reaction: "celebrate", gesture: "dance", line: "Estou dançando baixinho porque hoje tem coisa boa no ar!", duration: 3800 },
  { id: "watching", reaction: "idle", gesture: "stand", line: "Estou de olho em tudo com carinho. Escolha no seu tempo.", duration: 4800 },
];

function sceneForReaction(reaction: MascotReaction): MascotScene {
  if (reaction === "hungry") return AMBIENT_SCENES[0];
  if (reaction === "curious") return AMBIENT_SCENES[1];
  if (reaction === "sleepy") return AMBIENT_SCENES[2];
  if (reaction === "happy" || reaction === "celebrate") return { id: reaction, reaction, gesture: "wave", line: "Obaaa! Essa escolha deixou meu coração quentinho!", duration: 3200 };
  if (reaction === "full") return { id: "full", reaction, gesture: "belly", line: "Agora sim… vou tirar um cochilo de barriga cheia.", duration: 6200 };
  if (reaction === "avoid") return { id: "avoid", reaction, gesture: "coverEyes", line: "Não vou espiar nada, prometo. Privacidade é coisa séria!", duration: 5000 };
  return { id: "idle", reaction: "idle", gesture: "stand", line: "Estou aqui com você. Vamos encontrar uma boa escolha?", duration: 4800 };
}

export function PediuMascot({ theme, styleId = "classic", reaction = "idle", motionEnabled = true, compact = false, showSpeech = false, speechText, programmed = false, onPress }: { theme: AppTheme; styleId?: AppMascotStyle; reaction?: MascotReaction; motionEnabled?: boolean; compact?: boolean; showSpeech?: boolean; speechText?: string; programmed?: boolean; onPress?: () => void }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scene, setScene] = useState<MascotScene>(() => sceneForReaction(reaction));
  const bob = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
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
    Animated.timing(sceneProgress, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(handsProgress, { toValue: scene.gesture === "coverEyes" ? 1 : 0, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [handsProgress, scene.gesture, scene.id, sceneProgress]);

  useEffect(() => {
    if (!motionEnabled) {
      bob.stopAnimation();
      wiggle.stopAnimation();
      bob.setValue(0);
      wiggle.setValue(0);
      return;
    }
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: scene.gesture === "sleep" ? 1500 : scene.gesture === "lie" || scene.gesture === "sniff" ? 1100 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: scene.gesture === "sleep" ? 1500 : scene.gesture === "lie" || scene.gesture === "sniff" ? 1100 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const wiggleLoop = Animated.loop(Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: scene.reaction === "happy" || scene.reaction === "celebrate" ? 260 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: scene.reaction === "happy" || scene.reaction === "celebrate" ? 260 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]));
    bobLoop.start();
    if (scene.gesture === "wave" || scene.gesture === "peek" || scene.gesture === "sniff" || scene.gesture === "dance") wiggleLoop.start();
    return () => { bobLoop.stop(); wiggleLoop.stop(); };
  }, [bob, motionEnabled, scene.gesture, scene.reaction, wiggle]);

  const size = compact ? 72 : 104;
  const bodySize = compact ? 54 : 76;
  const faceSize = compact ? 43 : 60;
  const happy = scene.reaction === "happy" || scene.reaction === "celebrate";
  const sleepy = scene.reaction === "sleepy";
  const coverEyes = scene.gesture === "coverEyes";
  const scarfColor = styleId === "ocean" ? "#7BDFF2" : styleId === "sunset" ? "#FFCB77" : theme.highlight;
  const accentIcon = styleId === "ocean" ? "water-drop" : styleId === "sunset" ? "wb-sunny" : "favorite";
  const speech = speechText ?? scene.line;
  const bodyRotation = scene.gesture === "lie" ? "-70deg" : scene.gesture === "sleep" ? "5deg" : scene.gesture === "dance" ? "-4deg" : "0deg";
  const content = <Animated.View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, scene.gesture === "lie" ? 2 : happy ? -5 : -2] }) }, { scale: sceneProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, happy ? 1.06 : 1] }) }] }}>
    {showSpeech ? <Animated.View pointerEvents="none" style={[styles.speechBubble, compact && styles.speechBubbleCompact, { borderColor: theme.line, backgroundColor: theme.card, opacity: sceneProgress, right: compact ? 52 : 74, bottom: compact ? 45 : 67 }]}><View style={[styles.speechTail, { backgroundColor: theme.card, borderRightColor: theme.line }]} /><Text numberOfLines={compact ? 4 : 5} ellipsizeMode="tail" style={[styles.speechText, { color: theme.ink, fontSize: compact ? 10 : 12, lineHeight: compact ? 14 : 17 }]}>{speech}</Text></Animated.View> : null}
    <Animated.View pointerEvents="none" style={[styles.sparkles, { opacity: sceneProgress, transform: [{ scale: sceneProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }] }]}><Text style={{ color: scarfColor, fontSize: compact ? 13 : 17 }}>✦</Text><Text style={{ color: theme.primary, fontSize: compact ? 10 : 13 }}>•</Text><Text style={{ color: theme.highlight, fontSize: compact ? 12 : 16 }}>✦</Text></Animated.View>
    <View style={[styles.antenna, { backgroundColor: scarfColor, width: compact ? 3 : 4, height: compact ? 13 : 18, top: compact ? 3 : 0 }]}><View style={[styles.antennaDot, { backgroundColor: theme.primary, width: compact ? 8 : 10, height: compact ? 8 : 10 }]} /></View>
    <Animated.View style={[styles.body, { width: bodySize, height: bodySize, borderRadius: bodySize / 2.5, backgroundColor: theme.primary, shadowColor: theme.primary, transform: [{ rotate: bodyRotation }, { rotate: wiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-3deg", "0deg", "3deg"] }) }] }]}>
      <View style={[styles.ear, styles.leftEar, { backgroundColor: theme.primary }]} /><View style={[styles.ear, styles.rightEar, { backgroundColor: theme.primary }]} />
      <View style={[styles.face, { width: faceSize, height: faceSize, borderRadius: faceSize / 2, backgroundColor: theme.highlight }]}>
        <View style={styles.eyeRow}><View style={[happy || sleepy ? styles.closedEye : styles.eye, { backgroundColor: theme.ink }]} /><View style={[happy || sleepy ? styles.closedEye : styles.eye, { backgroundColor: theme.ink }]} /></View>
        <Text style={[styles.mouth, { color: theme.ink, fontSize: compact ? 17 : 22 }]}>{happy ? "⌣" : scene.reaction === "full" ? "◡" : scene.reaction === "hungry" ? "◡" : sleepy ? "﹏" : "•"}</Text>
      </View>
      {coverEyes ? <><Animated.View style={[styles.hand, styles.leftHand, { backgroundColor: theme.highlight, transform: [{ translateX: handsProgress.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }, { rotate: "-22deg" }] }]} /><Animated.View style={[styles.hand, styles.rightHand, { backgroundColor: theme.highlight, transform: [{ translateX: handsProgress.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }, { rotate: "22deg" }] }]} /></> : null}
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
  speechBubble: { position: "absolute", width: 214, minHeight: 45, borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8, shadowColor: "#163B48", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4, zIndex: 10 },
  speechBubbleCompact: { width: 182, minHeight: 38, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 6 },
  speechTail: { position: "absolute", right: -5, bottom: 12, width: 10, height: 10, transform: [{ rotate: "45deg" }], borderRightWidth: 1, borderBottomWidth: 1 },
  speechText: { fontWeight: "800", flexShrink: 1 },
  antenna: { position: "absolute", alignItems: "center", justifyContent: "flex-start", borderRadius: 5, zIndex: 2 },
  antennaDot: { borderRadius: 999, position: "absolute", top: -4 },
  body: { alignItems: "center", justifyContent: "center", shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5, position: "relative" },
  ear: { width: 17, height: 21, borderRadius: 10, position: "absolute", top: 10 },
  leftEar: { left: -6, transform: [{ rotate: "-25deg" }] },
  rightEar: { right: -6, transform: [{ rotate: "25deg" }] },
  face: { alignItems: "center", justifyContent: "center", gap: 1 },
  eyeRow: { flexDirection: "row", gap: 13, alignItems: "center" },
  eye: { width: 6, height: 8, borderRadius: 4 },
  closedEye: { width: 10, height: 4, borderRadius: 5, transform: [{ rotate: "-12deg" }] },
  mouth: { fontWeight: "900", lineHeight: 22 },
  hand: { position: "absolute", top: 18, width: 13, height: 25, borderRadius: 9, zIndex: 4 },
  leftHand: { left: 13 },
  rightHand: { right: 13 },
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
