import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { ProductCard } from "@/components/pediu/product-card";
import { Page, PEDIU } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

export default function FlashScreen() {
  const marketplaceQuery = trpc.pediu.marketplace.search.useQuery(
    { category: "Tudo", limit: 40, offset: 0 },
    { staleTime: 30_000 },
  );

  const products = (marketplaceQuery.data?.items ?? []).map((item, index) => ({
    id: item.id,
    name: item.name,
    store: item.storeName ?? "Loja",
    price: `R$ ${Number(item.price).toFixed(2).replace(".", ",")}`,
    distance: "perto",
    category: item.category,
    description: item.description,
    available: Boolean(item.available),
    flash: index % 3 !== 2,
  }));

  const flashItems = products.filter((p) => p.flash);

  return (
    <Page title="Flash" eyebrow="ENTREGA RÁPIDA" action={
      <Pressable onPress={() => router.push("/club")} style={styles.clubChip}>
        <MaterialIcons name="workspace-premium" size={16} color={PEDIU_TOKENS.accentFg} />
        <Text style={styles.clubChipText}>Club</Text>
      </Pressable>
    }>
      <View style={styles.hero}>
        <MaterialIcons name="bolt" size={22} color={PEDIU_TOKENS.accent} />
        <Text style={styles.heroTitle}>Pedidos que pulam a fila</Text>
        <Text style={styles.heroBody}>
          Superfície portada do Pediu 2.0. Na Fase 1 listamos o catálogo real; elegibilidade Flash completa chega com o domínio (flag de loja + cotação).
        </Text>
      </View>

      {marketplaceQuery.isLoading ? (
        <ActivityIndicator color={PEDIU.coral} />
      ) : flashItems.length ? (
        <View style={{ gap: 12 }}>
          {flashItems.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(product.id) } })}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="bolt"
          title="Nada em Flash agora"
          body="Quando lojas abrirem com entrega rápida, elas aparecem aqui."
          actionLabel="Voltar ao início"
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
  },
  heroTitle: { color: PEDIU_TOKENS.white, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  heroBody: { color: "rgba(255,244,232,0.72)", fontSize: 12, lineHeight: 18 },
  clubChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PEDIU_TOKENS.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clubChipText: { color: PEDIU_TOKENS.accentFg, fontSize: 11, fontWeight: "800" },
});
