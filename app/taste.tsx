import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { ProductCard } from "@/components/pediu/product-card";
import { Page, PEDIU, s } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

const MOODS = [
  { id: "comfort", title: "Conforto", subtitle: "Comida de abraço", query: "lanche", tone: "ink" as const },
  { id: "fresh", title: "Leve", subtitle: "Frescor agora", query: "doce", tone: "accent" as const },
  { id: "party", title: "Festa", subtitle: "Pra compartilhar", query: "pizza", tone: "primary" as const },
  { id: "late", title: "Madrugada", subtitle: "Aberto perto", query: "lanche", tone: "ink" as const },
];

export default function TasteScreen() {
  const [moodId, setMoodId] = useState<string | null>(null);
  const selected = MOODS.find((m) => m.id === moodId);

  const search = trpc.pediu.marketplace.search.useQuery(
    { category: "Tudo", query: selected?.query, limit: 30, offset: 0 },
    { enabled: Boolean(selected), staleTime: 30_000 },
  );

  const products = useMemo(
    () =>
      (search.data?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        store: item.storeName ?? "Loja",
        price: `R$ ${Number(item.price).toFixed(2).replace(".", ",")}`,
        distance: "perto",
        category: item.category,
        description: item.description,
        available: Boolean(item.available),
      })),
    [search.data],
  );

  return (
    <Page title="Sabor do momento" eyebrow="DESCOBERTA">
      <Text style={s.muted}>Diz como está a fome. A gente monta o cardápio com o marketplace real.</Text>

      <View style={styles.grid}>
        {MOODS.map((mood, index) => {
          const active = mood.id === moodId;
          const bg = active
            ? PEDIU_TOKENS.primary
            : mood.tone === "accent"
              ? PEDIU_TOKENS.accent
              : mood.tone === "primary"
                ? PEDIU_TOKENS.primary
                : PEDIU_TOKENS.ink;
          const fg = mood.tone === "accent" && !active ? PEDIU_TOKENS.accentFg : PEDIU_TOKENS.white;
          return (
            <Pressable
              key={mood.id}
              onPress={() => setMoodId(mood.id)}
              style={({ pressed }) => [
                styles.mood,
                { backgroundColor: bg },
                pressed && { transform: [{ scale: 0.97 }] },
                { opacity: 1 - index * 0 },
              ]}
            >
              <Text style={[styles.moodTitle, { color: fg }]}>{mood.title}</Text>
              <Text style={[styles.moodSub, { color: fg, opacity: 0.8 }]}>{mood.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View style={{ gap: 12 }}>
          <Text style={s.sectionTitle}>Pra agora · {selected.title}</Text>
          {search.isLoading ? (
            <ActivityIndicator color={PEDIU.coral} />
          ) : products.length ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(product.id) } })}
              />
            ))
          ) : (
            <EmptyState
              icon="restaurant"
              title="Nada nesse humor ainda"
              body="Tente outro sabor ou explore o início enquanto o ranking Sabor sobe pro servidor."
              actionLabel="Ver Flash"
              onAction={() => router.push("/flash")}
            />
          )}
        </View>
      ) : (
        <EmptyState
          icon="auto-awesome"
          title="Escolha um humor"
          body="Conforto, leve, festa ou madrugada — a busca usa o catálogo Pediu de verdade."
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mood: {
    width: "48%",
    borderRadius: 24,
    padding: 16,
    minHeight: 100,
    justifyContent: "flex-end",
    shadowColor: "#1A120C",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  moodTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  moodSub: { fontSize: 11, marginTop: 4, fontWeight: "600" },
});
