import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PediuPressable, PediuReveal } from "@/components/pediu-motion";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

type Props = {
  icon?: ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function EmptyState({
  icon = "inbox",
  title,
  body,
  actionLabel,
  onAction,
  children,
}: Props) {
  return (
    <PediuReveal variant="scaleIn">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={icon} size={28} color={PEDIU_TOKENS.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {children}
        {actionLabel && onAction ? (
          <PediuPressable style={styles.btn} onPress={onAction}>
            <Text style={styles.btnText}>{actionLabel}</Text>
            <MaterialIcons
              name="arrow-forward"
              size={16}
              color={PEDIU_TOKENS.white}
            />
          </PediuPressable>
        ) : null}
      </View>
    </PediuReveal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: PEDIU_TOKENS.radius.xxl,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    shadowColor: PEDIU_TOKENS.inkDeep,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: PEDIU_TOKENS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: PEDIU_TOKENS.inkDeep,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    color: PEDIU_TOKENS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  btn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: PEDIU_TOKENS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: PEDIU_TOKENS.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  btnText: { color: PEDIU_TOKENS.white, fontSize: 13, fontWeight: "800" },
});
