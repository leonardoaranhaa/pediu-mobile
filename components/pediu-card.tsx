import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import {
  PediuPressable,
  PediuReveal,
  type PediuMotionVariant,
} from "@/components/pediu-motion";

type Props = {
  children: ReactNode;
  delay?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: PediuMotionVariant;
};

/** Card único para descoberta, produto, operação e estados de conta. */
export function PediuCard({
  children,
  delay = 0,
  onPress,
  style,
  variant = "fadeUp",
}: Props) {
  const content = <View style={[styles.card, style]}>{children}</View>;

  return (
    <PediuReveal delay={delay} variant={variant}>
      {onPress ? (
        <PediuPressable onPress={onPress} style={styles.pressable}>
          {content}
        </PediuPressable>
      ) : (
        content
      )}
    </PediuReveal>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: PEDIU_TOKENS.radius.xxl, overflow: "hidden" },
  card: {
    overflow: "hidden",
    borderRadius: PEDIU_TOKENS.radius.xxl,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    backgroundColor: PEDIU_TOKENS.surface,
    shadowColor: PEDIU_TOKENS.inkDeep,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});
