import { StyleSheet, View } from "react-native";

import { PediuMascot } from "@/components/pediu-mascot";
import { PediuFloating } from "@/components/pediu-motion";
import type {
  AppMascotStyle,
  AppTheme,
  MascotMomentReaction,
} from "@/lib/app-preferences";

/**
 * Camada contextual do mascote. O assistente não fica mais aqui: seu launcher
 * pertence ao dock inferior de cada modo para evitar sobreposição e duplicação.
 */
export function PediuMascotDock({
  theme,
  mascotStyle,
  mascotEnabled,
  motionEnabled,
  showHints,
  reaction,
  bottom,
  onMascotPress,
}: {
  theme: AppTheme;
  mascotStyle: AppMascotStyle;
  mascotEnabled: boolean;
  motionEnabled: boolean;
  showHints: boolean;
  reaction: MascotMomentReaction;
  bottom: number;
  onMascotPress: () => void;
}) {
  if (!mascotEnabled) return null;

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 16,
    zIndex: 30,
    alignItems: "flex-end",
    overflow: "visible",
  },
  mascotStage: {
    width: 82,
    height: 82,
    overflow: "visible",
    justifyContent: "flex-end",
  },
});
