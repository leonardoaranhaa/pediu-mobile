import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Page, PEDIU } from "@/components/pediu-page";
import { assetForCategory, FOOD_ASSETS, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

export default function MarketScreen() {
  const [cat, setCat] = useState("Tudo");
  const marketplaceQuery = trpc.pediu.marketplace.search.useQuery(
    { category: cat === "Tudo" ? "Tudo" : cat, query: cat === "Tudo" ? "mercado" : undefined, limit: 40, offset: 0 },
    { staleTime: 30_000 },
  );

  const cats = useMemo(() => {
    const fromData = Array.from(new Set((marketplaceQuery.data?.items ?? []).map((p) => p.category)));
    return ["Tudo", ...fromData];
  }, [marketplaceQuery.data]);

  const items = marketplaceQuery.data?.items ?? [];

  return (
    <Page title="Mercado Pediu" eyebrow="RELÂMPAGO 25 MIN" back>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <MaterialIcons name="bolt" size={14} color={PEDIU_TOKENS.accentFg} />
          <Text style={styles.badgeText}>Relâmpago 25 min</Text>
        </View>
        <Text style={styles.heroTitle}>Mercado Pediu</Text>
        <Text style={styles.heroBody}>
          Hortifruti e mercearia com a mesma operação de entrega. Fase 1 usa o marketplace real; vertical `market` no schema vem na Fase 3a.
        </Text>
        <Image source={FOOD_ASSETS.feijoada} style={styles.heroImg} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
        {cats.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={[styles.chip, cat === c && styles.chipOn]}
          >
            <Text style={[styles.chipText, cat === c && styles.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {marketplaceQuery.isLoading ? (
        <ActivityIndicator color={PEDIU.coral} />
      ) : items.length ? (
        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.9 }]}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(item.id) } })}
            >
              <Image source={assetForCategory(item.category, item.id)} style={styles.cellImg} />
              <View style={styles.cellBody}>
                <Text style={styles.cellName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cellPrice}>R$ {Number(item.price).toFixed(2).replace(".", ",")}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="shopping-cart"
          title="Mercado ainda quieto"
          body="Publique produtos com categoria de mercearia ou aguarde lojas market no domínio."
          actionLabel="Explorar início"
          onAction={() => router.replace("/")}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 24,
    padding: 18,
    gap: 8,
    overflow: "hidden",
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PEDIU_TOKENS.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: PEDIU_TOKENS.accentFg, fontSize: 11, fontWeight: "800" },
  heroTitle: { color: PEDIU_TOKENS.white, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  heroBody: { color: "rgba(255,244,232,0.7)", fontSize: 12, lineHeight: 18, maxWidth: 280 },
  heroImg: { position: "absolute", right: -20, bottom: -30, width: 120, height: 120, borderRadius: 60, opacity: 0.35 },
  cats: { gap: 8, paddingVertical: 4 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: PEDIU_TOKENS.surface,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: PEDIU_TOKENS.primary, borderColor: PEDIU_TOKENS.primary },
  chipText: { color: PEDIU_TOKENS.muted, fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: PEDIU_TOKENS.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "48%",
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
  },
  cellImg: { width: "100%", height: 110 },
  cellBody: { padding: 10, gap: 4 },
  cellName: { color: PEDIU_TOKENS.ink, fontSize: 13, fontWeight: "800" },
  cellPrice: { color: PEDIU_TOKENS.ink, fontSize: 13, fontWeight: "900" },
});
