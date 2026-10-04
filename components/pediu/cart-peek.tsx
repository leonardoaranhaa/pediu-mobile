import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

type Props = {
  itemCount: number;
  subtitle?: string;
  totalLabel: string;
  onPress: () => void;
};

export function CartPeek({ itemCount, subtitle, totalLabel, onPress }: Props) {
  if (itemCount <= 0) return null;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={({ pressed }) => [styles.bar, pressed && { transform: [{ scale: 0.97 }] }]} onPress={onPress}>
        <View style={styles.left}>
          <View style={styles.count}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
          <View>
            <Text style={styles.title}>Ver sacola</Text>
            {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.total}>{totalLabel}</Text>
          <MaterialIcons name="arrow-forward" size={18} color={PEDIU_TOKENS.primaryFg} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, bottom: 88, zIndex: 20 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PEDIU_TOKENS.primary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: PEDIU_TOKENS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  count: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,247,245,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: PEDIU_TOKENS.primaryFg, fontSize: 14, fontWeight: "800" },
  title: { color: PEDIU_TOKENS.primaryFg, fontSize: 14, fontWeight: "800" },
  sub: { color: "rgba(255,247,245,0.8)", fontSize: 11, marginTop: 2, maxWidth: 160 },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  total: { color: PEDIU_TOKENS.primaryFg, fontSize: 14, fontWeight: "800" },
});
