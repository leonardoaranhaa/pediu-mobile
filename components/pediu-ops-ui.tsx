import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppPreferences } from "@/lib/app-preferences";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { PediuPressable, PediuReveal } from "@/components/pediu-motion";

const INK = "#111111";
const WHITE = "#FFFDF9";
const MUTED = "#6E635A";
const LINE = "#E9DED3";
const CANVAS = "#FFF4E8";
const GREEN = "#0B8A5C";
const YELLOW = "#FFC400";
const RED = "#E20D2A";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function OpsShell({
  children,
  dock,
}: {
  children: ReactNode;
  dock: ReactNode;
}) {
  const { theme } = useAppPreferences();
  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbOne,
          { backgroundColor: theme.primarySoft },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTwo,
          { backgroundColor: `${theme.highlight}42` },
        ]}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      {dock}
    </View>
  );
}

export function OpsHeader({
  eyebrow,
  title,
  subtitle,
  status,
  statusTone = "success",
  onStatusPress,
  statusIcon = "storefront",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: "success" | "accent" | "neutral";
  onStatusPress?: () => void;
  statusIcon?: IconName;
}) {
  const { theme } = useAppPreferences();
  return (
    <View style={styles.header}>
      <PediuReveal style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          {eyebrow}
        </Text>
        <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {subtitle}
        </Text>
      </PediuReveal>
      {status ? (
        <PediuPressable
          onPress={onStatusPress}
          disabled={!onStatusPress}
          style={[
            styles.statusButton,
            statusTone === "success"
              ? styles.statusSuccess
              : statusTone === "accent"
                ? { backgroundColor: theme.highlight }
                : styles.statusNeutral,
          ]}
        >
          <MaterialIcons
            name={statusIcon}
            size={20}
            color={statusTone === "neutral" ? theme.ink : INK}
          />
          <Text
            style={[
              styles.statusText,
              { color: statusTone === "neutral" ? theme.ink : INK },
            ]}
          >
            {status}
          </Text>
        </PediuPressable>
      ) : null}
    </View>
  );
}

export function OpsMetric({
  value,
  label,
  dark = false,
}: {
  value: string | number;
  label: string;
  dark?: boolean;
}) {
  const { theme } = useAppPreferences();
  return (
    <PediuReveal
      style={[
        styles.metric,
        dark ? { backgroundColor: INK, borderColor: INK } : null,
      ]}
    >
      <Text style={[styles.metricValue, { color: dark ? WHITE : theme.ink }]}>
        {value}
      </Text>
      <Text
        style={[styles.metricLabel, { color: dark ? "#C9BDB0" : theme.muted }]}
      >
        {label}
      </Text>
    </PediuReveal>
  );
}

export function OpsCard({
  children,
  style,
  delay = 0,
}: {
  children: ReactNode;
  style?: object;
  delay?: number;
}) {
  const { theme } = useAppPreferences();
  return (
    <PediuReveal delay={delay}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.line },
          style,
        ]}
      >
        {children}
      </View>
    </PediuReveal>
  );
}

export function OpsSectionTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  const { theme } = useAppPreferences();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.ink }]}>
        {title}
        {count == null ? "" : `  ${count}`}
      </Text>
      {action}
    </View>
  );
}

export function OpsBadge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "accent" | "success" | "muted";
}) {
  const { theme } = useAppPreferences();
  const backgroundColor =
    tone === "accent"
      ? theme.highlight
      : tone === "success"
        ? "#DDF5E9"
        : tone === "muted"
          ? "#F0E7DE"
          : theme.primary;
  const color =
    tone === "primary" ? "#FFF7F5" : tone === "success" ? GREEN : INK;
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

export function OpsButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "outline" | "ghost";
  disabled?: boolean;
  style?: object;
}) {
  const { theme } = useAppPreferences();
  const backgroundColor =
    variant === "primary"
      ? theme.primary
      : variant === "accent"
        ? theme.highlight
        : variant === "outline"
          ? theme.card
          : "transparent";
  const color = variant === "primary" ? "#FFF7F5" : theme.ink;
  return (
    <PediuPressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "outline" ? theme.line : backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </PediuPressable>
  );
}

export type OpsDockItem = {
  label: string;
  icon: IconName;
  to: string;
  active?: boolean;
};

export function OpsDock({ items }: { items: OpsDockItem[] }) {
  const { theme } = useAppPreferences();
  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <View style={styles.dock}>
        {items.map((item) => (
          <PediuPressable
            key={item.label}
            onPress={() => router.push(item.to as never)}
            style={[
              styles.dockItem,
              item.active ? { backgroundColor: theme.highlight } : null,
            ]}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={item.active ? INK : "#B7ADA5"}
            />
            <Text
              style={[
                styles.dockLabel,
                { color: item.active ? INK : "#B7ADA5" },
              ]}
            >
              {item.label}
            </Text>
          </PediuPressable>
        ))}
      </View>
    </View>
  );
}

export function OpsOrderLines({ lines }: { lines: string[] }) {
  const { theme } = useAppPreferences();
  return (
    <View style={styles.lines}>
      {lines.slice(0, 4).map((line) => (
        <Text key={line} style={[styles.orderLine, { color: theme.ink }]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export const OPS_COLORS = {
  INK,
  WHITE,
  MUTED,
  LINE,
  CANVAS,
  GREEN,
  YELLOW,
  RED,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  content: {
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 126,
    gap: 18,
  },
  orb: { position: "absolute", borderRadius: 999, opacity: 0.48 },
  orbOne: { width: 220, height: 220, right: -118, top: -104 },
  orbTwo: { width: 190, height: 190, left: -128, bottom: 82 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.25,
    marginBottom: 6,
  },
  title: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 33,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  subtitle: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 17,
    marginTop: 5,
    lineHeight: 23,
  },
  statusButton: {
    marginTop: 31,
    minWidth: 128,
    minHeight: 55,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusSuccess: { backgroundColor: GREEN },
  statusNeutral: { backgroundColor: "#F0E7DE" },
  statusText: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: "900",
  },
  metricRow: { flexDirection: "row", gap: 12 },
  metric: {
    flex: 1,
    minWidth: 0,
    minHeight: 108,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: "center",
    shadowColor: INK,
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  metricValue: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  metricLabel: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 21,
    gap: 13,
    shadowColor: INK,
    shadowOpacity: 0.065,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.45,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  button: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: "900",
  },
  lines: { gap: 4 },
  orderLine: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 16,
    lineHeight: 23,
  },
  dockWrap: { position: "absolute", left: 20, right: 20, bottom: 18 },
  dock: {
    minHeight: 84,
    borderRadius: 38,
    backgroundColor: INK,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: INK,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  dockItem: {
    minWidth: 92,
    minHeight: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 10,
  },
  dockLabel: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 12,
    fontWeight: "900",
  },
});
