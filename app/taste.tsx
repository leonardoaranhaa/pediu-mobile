import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { ProductCard } from "@/components/pediu/product-card";
import { Page, PEDIU, s } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

export default function TasteScreen() {
  const [moodId, setMoodId] = useState<string | null>(null);
  const moodsQuery = trpc.pediu.marketplace.moods.useQuery(undefined, {
    staleTime: 60_000,
  });
  const moods = moodsQuery.data ?? [];
  const selected = moods.find((m) => m.id === moodId);

  const search = trpc.pediu.marketplace.taste.useQuery(
    { moodId: moodId ?? "comfort", limit: 30, offset: 0 },
    { enabled: Boolean(moodId), staleTime: 30_000 },
  );

  const products = (search.data?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    store: item.storeName ?? "Loja",
    price: `R$ ${Number(item.price).toFixed(2).replace(".", ",")}`,
    distance: item.flashEnabled
      ? `Flash ${item.flashEtaMaxMinutes} min`
      : "perto",
    category: item.category,
    description: item.description,
    available: Boolean(item.available),
    flash: Boolean(item.flashEnabled),
  }));

  return (
    <Page title="Sabor do momento" eyebrow="DESCOBERTA">
      <Text style={s.muted}>
        Humor → query canônica no servidor (`marketplace.taste`). Sem
        personalização invasiva na v1.
      </Text>

      <View style={styles.grid}>
        {moods.map((mood, index) => {
          const active = mood.id === moodId;
          const tones = [
            PEDIU_TOKENS.ink,
            PEDIU_TOKENS.accent,
            PEDIU_TOKENS.primary,
            PEDIU_TOKENS.ink,
          ] as const;
          const bg = active
            ? PEDIU_TOKENS.primary
            : tones[index % tones.length];
          const fg =
            !active && tones[index % tones.length] === PEDIU_TOKENS.accent
              ? PEDIU_TOKENS.accentFg
              : PEDIU_TOKENS.white;
          return (
            <Pressable
              key={mood.id}
              onPress={() => setMoodId(mood.id)}
              style={({ pressed }) => [
                styles.mood,
                { backgroundColor: bg },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={[styles.moodTitle, { color: fg }]}>
                {mood.title}
              </Text>
              <Text style={[styles.moodSub, { color: fg, opacity: 0.8 }]}>
                {mood.subtitle}
              </Text>
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
                onPress={() =>
                  router.push({
                    pathname: "/product/[id]",
                    params: { id: String(product.id) },
                  })
                }
              />
            ))
          ) : (
            <EmptyState
              icon="restaurant"
              title="Nada nesse humor ainda"
              body="Tente outro sabor ou explore o início enquanto o catálogo cresce."
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
