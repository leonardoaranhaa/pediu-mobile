import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppMascotStyle, AppTheme } from "@/lib/app-preferences";

export type MascotReaction = "idle" | "hungry" | "happy";

export function PediuMascot({ theme, styleId = "classic", reaction = "idle", motionEnabled = true, compact = false, onPress }: { theme: AppTheme; styleId?: AppMascotStyle; reaction?: MascotReaction; motionEnabled?: boolean; compact?: boolean; onPress?: () => void }) {
  const bob = useRef(new Animated.Value(0)).current;
  const reactionProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionEnabled) {
      bob.stopAnimation();
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: reaction === "happy" ? 550 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: reaction === "happy" ? 550 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bob, motionEnabled, reaction]);

  useEffect(() => {
    if (!motionEnabled || reaction !== "happy") {
      reactionProgress.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.timing(reactionProgress, { toValue: 1, duration: 180, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(reactionProgress, { toValue: 0, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [motionEnabled, reaction, reactionProgress]);

  const size = compact ? 72 : 104;
  const bodySize = compact ? 54 : 76;
  const faceSize = compact ? 43 : 60;
  const happy = reaction === "happy";
  const hungry = reaction === "hungry";
  const scarfColor = styleId === "ocean" ? "#7BDFF2" : styleId === "sunset" ? "#FFCB77" : theme.highlight;
  const accentIcon = styleId === "ocean" ? "water-drop" : styleId === "sunset" ? "wb-sunny" : "favorite";
  const content = <Animated.View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, happy ? -5 : -2] }) }, { scale: reactionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
    <Animated.View pointerEvents="none" style={[styles.sparkles, { opacity: reactionProgress, transform: [{ scale: reactionProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }] }]}><Text style={{ color: scarfColor, fontSize: compact ? 13 : 17 }}>✦</Text><Text style={{ color: theme.primary, fontSize: compact ? 10 : 13 }}>•</Text><Text style={{ color: theme.highlight, fontSize: compact ? 12 : 16 }}>✦</Text></Animated.View>
    <View style={[styles.antenna, { backgroundColor: scarfColor, width: compact ? 3 : 4, height: compact ? 13 : 18, top: compact ? 3 : 0 }]}><View style={[styles.antennaDot, { backgroundColor: theme.primary, width: compact ? 8 : 10, height: compact ? 8 : 10 }]} /></View>
    <View style={[styles.body, { width: bodySize, height: bodySize, borderRadius: bodySize / 2.5, backgroundColor: theme.primary, shadowColor: theme.primary }]}>
      <View style={[styles.ear, styles.leftEar, { backgroundColor: theme.primary }]} /><View style={[styles.ear, styles.rightEar, { backgroundColor: theme.primary }]} />
      <View style={[styles.face, { width: faceSize, height: faceSize, borderRadius: faceSize / 2, backgroundColor: theme.highlight }]}>
        <View style={styles.eyeRow}><View style={[happy ? styles.closedEye : styles.eye, { backgroundColor: theme.ink }]} /><View style={[happy ? styles.closedEye : styles.eye, { backgroundColor: theme.ink }]} /></View>
        <Text style={[styles.mouth, { color: theme.ink, fontSize: compact ? 17 : 22 }]}>{happy ? "⌣" : hungry ? "◡" : "•"}</Text>
      </View>
      <View style={[styles.scarf, { backgroundColor: scarfColor, height: compact ? 8 : 11 }]}><Text style={[styles.scarfMark, { color: theme.ink, fontSize: compact ? 8 : 10 }]}>p</Text></View>
    </View>
    <View style={[styles.foot, styles.leftFoot, { backgroundColor: theme.ink, width: compact ? 18 : 25 }]} /><View style={[styles.foot, styles.rightFoot, { backgroundColor: theme.ink, width: compact ? 18 : 25 }]} />
    <View style={[styles.iconBadge, { backgroundColor: theme.ink, width: compact ? 19 : 25, height: compact ? 19 : 25, borderRadius: compact ? 10 : 13 }]}><MaterialIcons name={accentIcon} size={compact ? 10 : 13} color={scarfColor} /></View>
  </Animated.View>;

  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={happy ? "Mascote feliz" : "Mascote do Pediu"} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] }]}>{content}</Pressable> : content;
}

export function MascotStatus({ theme, reaction, compact = false }: { theme: AppTheme; reaction: MascotReaction; compact?: boolean }) {
  const text = reaction === "happy" ? "Oba! Mais um mimo no pedido." : reaction === "hungry" ? "Estou com fome de boas escolhas." : "Vou ficar de olho no seu pedido.";
  return <View style={[styles.status, { backgroundColor: theme.card, borderColor: theme.line, padding: compact ? 9 : 12 }]}><PediuMascot theme={theme} reaction={reaction} motionEnabled compact /><View style={{ flex: 1, gap: 2 }}><Text style={[styles.statusKicker, { color: theme.primary }]}>PEDIU</Text><Text style={[styles.statusText, { color: theme.ink }]}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
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
  scarf: { position: "absolute", bottom: 10, left: 7, right: 7, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scarfMark: { fontWeight: "900", fontStyle: "italic" },
  foot: { height: 7, borderRadius: 5, position: "absolute", bottom: 5 },
  leftFoot: { marginLeft: -22, transform: [{ rotate: "-10deg" }] },
  rightFoot: { marginLeft: 22, transform: [{ rotate: "10deg" }] },
  sparkles: { position: "absolute", top: -2, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between", zIndex: 3 },
  iconBadge: { position: "absolute", right: 4, bottom: 9, alignItems: "center", justifyContent: "center" },
  status: { borderWidth: 1, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 9 },
  statusKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  statusText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
});
