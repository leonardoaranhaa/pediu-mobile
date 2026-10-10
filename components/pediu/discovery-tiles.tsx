import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  PediuFloating,
  PediuPressable,
  PediuReveal,
} from "@/components/pediu-motion";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

const TILES = [
  {
    key: "taste",
    title: "O que pedir?",
    subtitle: "Sabor do momento",
    href: "/taste" as const,
    icon: "auto-awesome" as const,
    bg: PEDIU_TOKENS.primary,
    fg: PEDIU_TOKENS.primaryFg,
    accent: PEDIU_TOKENS.primaryFg,
  },
  {
    key: "market",
    title: "Mercado Flash",
    subtitle: "Até 25 min",
    href: "/market" as const,
    icon: "storefront" as const,
    bg: PEDIU_TOKENS.inkDeep,
    fg: PEDIU_TOKENS.white,
    accent: PEDIU_TOKENS.accent,
  },
];

export function DiscoveryTiles() {
  return (
    <View style={styles.grid}>
      {TILES.map((tile, index) => (
        <PediuReveal key={tile.key} delay={index * 70} style={styles.tileSlot}>
          <PediuPressable
            style={[styles.tile, { backgroundColor: tile.bg }]}
            onPress={() => router.push(tile.href)}
          >
            <MaterialIcons name={tile.icon} size={22} color={tile.accent} />
            <Text style={[styles.title, { color: tile.fg }]}>{tile.title}</Text>
            <Text style={[styles.sub, { color: tile.fg, opacity: 0.75 }]}>
              {tile.subtitle}
            </Text>
          </PediuPressable>
        </PediuReveal>
      ))}
    </View>
  );
}

export function FlashRadarBanner({ count }: { count: number }) {
  return (
    <PediuReveal delay={150}>
      <PediuPressable
        style={styles.radar}
        onPress={() => router.push("/flash")}
      >
        <PediuFloating distance={3} duration={2100} style={styles.radarIcon}>
          <MaterialIcons name="bolt" size={20} color={PEDIU_TOKENS.accentFg} />
        </PediuFloating>
        <View style={styles.radarCopy}>
          <Text style={styles.radarTitle}>Flash perto de você</Text>
          <Text style={styles.radarSub}>
            {count > 0
              ? `${count} opções com entrega rápida`
              : "Veja lojas elegíveis a entrega Flash"}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={PEDIU_TOKENS.inkDeep}
        />
      </PediuPressable>
    </PediuReveal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 10 },
  tileSlot: { flex: 1 },
  tile: {
    borderRadius: 24,
    padding: 16,
    minHeight: 118,
    justifyContent: "space-between",
    shadowColor: PEDIU_TOKENS.inkDeep,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sub: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  radar: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    shadowColor: PEDIU_TOKENS.inkDeep,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  radarIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: PEDIU_TOKENS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  radarCopy: { flex: 1 },
  radarTitle: { color: PEDIU_TOKENS.inkDeep, fontSize: 14, fontWeight: "800" },
  radarSub: { color: PEDIU_TOKENS.muted, fontSize: 11, marginTop: 2 },
});
