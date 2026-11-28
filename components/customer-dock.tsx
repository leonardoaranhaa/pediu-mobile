import { MaterialIcons } from "@expo/vector-icons";
import type { Ref } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PediuPressable } from "@/components/pediu-motion";
import { useAppPreferences } from "@/lib/app-preferences";
import { cardElevation, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { bottomSafeInset } from "@/lib/screen-space";

export type CustomerDockItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  a11y: string;
  selected: boolean;
  onPress: () => void;
  ref?: Ref<View>;
};

/** The customer's bottom tab bar: same look on the home and on screens like Search. */
export function CustomerDock({ items }: { items: CustomerDockItem[] }) {
  const { theme } = useAppPreferences();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { bottom: bottomSafeInset(insets.bottom, Platform.OS) },
        cardElevation("raised"),
      ]}
    >
      {items.map((item) => {
        const color = item.selected ? theme.primary : PEDIU_TOKENS.muted;
        return (
          <PediuPressable
            key={item.id}
            ref={item.ref}
            accessibilityRole="button"
            accessibilityLabel={item.a11y}
            accessibilityState={{ selected: item.selected }}
            style={styles.item}
            onPress={item.onPress}
          >
            <View style={[styles.pill, item.selected && { backgroundColor: theme.primarySoft }]}>
              <MaterialIcons name={item.icon} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color, fontWeight: item.selected ? "900" : "700" }]}>{item.label}</Text>
          </PediuPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 78,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    backgroundColor: PEDIU_TOKENS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  item: { alignItems: "center", justifyContent: "center", gap: 3, minWidth: 64, height: 56, borderRadius: 20 },
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 11 },
});
