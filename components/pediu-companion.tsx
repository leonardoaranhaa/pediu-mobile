import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { PediuMascot } from "@/components/pediu-mascot";
import {
  PediuFloating,
  PediuPressable,
  PediuPulse,
} from "@/components/pediu-motion";
import type {
  AppMascotStyle,
  AppTheme,
  MascotMomentReaction,
} from "@/lib/app-preferences";

export function PediuCompanion({
  theme,
  mascotStyle,
  mascotEnabled,
  motionEnabled,
  showHints,
  reaction,
  bottom,
  onAssistant,
  onMascotPress,
}: {
  theme: AppTheme;
  mascotStyle: AppMascotStyle;
  mascotEnabled: boolean;
  motionEnabled: boolean;
  showHints: boolean;
  reaction: MascotMomentReaction;
  bottom: number;
  onAssistant: () => void;
  onMascotPress: () => void;
}) {
  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom }]}>
      {mascotEnabled ? (
        <PediuFloating
          enabled={motionEnabled}
          distance={4}
          duration={2200}
          style={styles.mascotStage}
        >
          <PediuMascot
            theme={theme}
            styleId={mascotStyle}
            reaction={reaction}
            motionEnabled={motionEnabled}
            compact
            programmed={reaction === "idle" || reaction === "hungry"}
            showSpeech={showHints}
            onPress={onMascotPress}
          />
        </PediuFloating>
      ) : null}
      <PediuPulse enabled={motionEnabled} style={styles.assistantPulse}>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Abrir assistente do Pediu"
          onPress={onAssistant}
          style={[styles.assistantButton, { backgroundColor: theme.primary }]}
        >
          <MaterialIcons name="auto-awesome" size={21} color="#FFFDF9" />
        </PediuPressable>
      </PediuPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 16,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "flex-end",
    overflow: "visible",
  },
  mascotStage: {
    width: 82,
    height: 82,
    overflow: "visible",
    justifyContent: "flex-end",
  },
  assistantPulse: {
    marginBottom: 3,
    marginLeft: 2,
  },
  assistantButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFF4E8",
    shadowColor: "#111111",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
});
