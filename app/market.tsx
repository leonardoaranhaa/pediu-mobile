import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import {
  PediuPressable,
  PediuPulse,
  PediuReveal,
} from "@/components/pediu-motion";
import { Card, Page, PEDIU, PrimaryButton } from "@/components/pediu-page";
import { assetForCategory, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/providers/cart-provider";
import { formatCatalogPrice, unitSubtitle } from "@/shared/market-units";

function money(value: number | string) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

export default function MarketScreen() {
  const [cat, setCat] = useState("Tudo");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const { items: cartItems, itemCount, subtotal, addItem } = useCart();
  const marketplaceQuery = trpc.pediu.marketplace.search.useQuery(
    {
      category: cat === "Tudo" ? undefined : cat,
      query: query.trim() || undefined,
      vertical: "market",
      limit: 40,
      offset: 0,
    },
    { staleTime: 30_000 },
  );

  const cats = useMemo(() => {
    const fromData = Array.from(
      new Set(
        (marketplaceQuery.data?.items ?? []).map((product) => product.category),
      ),
    );
    return ["Tudo", ...fromData];
  }, [marketplaceQuery.data]);

  const items = useMemo(
    () => marketplaceQuery.data?.items ?? [],
    [marketplaceQuery.data?.items],
  );
  const stores = useMemo(
    () => Array.from(new Set(items.map((item) => item.storeName))).length,
    [items],
  );
  const cartStoreName = cartItems[0]?.storeName;

  const addQuick = (item: (typeof items)[number]) => {
    const result = addItem(
      {
        id: item.id,
        storeId: item.storeId,
        name: item.name,
        storeName: item.storeName,
        category: item.category,
        description: item.description,
        price: String(item.price),
        deliveryFee: String(item.deliveryFee ?? "0.00"),
        storeKind: item.storeKind,
        flashEnabled: Boolean(item.flashEnabled),
        saleUnit: item.saleUnit,
        packSize: item.packSize,
      },
      1,
    );
    setNotice(
      result.ok
        ? `${item.name} foi para a sacola.`
        : (result.error ?? "Não foi possível adicionar o produto."),
    );
  };

  return (
    <Page
      title="Pediu Mercado"
      eyebrow="COMPRAS DO BAIRRO"
      back
      action={
        <PediuPressable
          onPress={() => router.push("/cart")}
          style={styles.cartAction}
        >
          <MaterialIcons name="shopping-bag" size={17} color={PEDIU.white} />
          <Text style={styles.cartActionText}>{itemCount}</Text>
        </PediuPressable>
      }
    >
      <PediuReveal>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.badge}>
              <MaterialIcons
                name="local-shipping"
                size={15}
                color={PEDIU_TOKENS.accentFg}
              />
              <Text style={styles.badgeText}>Pediu Entregas</Text>
            </View>
            <PediuPulse>
              <View style={styles.liveDot} />
            </PediuPulse>
          </View>
          <Text style={styles.heroTitle}>
            A compra do mercado, sem sair de casa.
          </Text>
          <Text style={styles.heroBody}>
            Escolha produtos por unidade, kg ou caixa. O mercado separa e um
            entregador parceiro retira e leva até seu endereço.
          </Text>
          <View style={styles.steps}>
            {[
              ["1", "Escolha"],
              ["2", "Mercado separa"],
              ["3", "Pediu entrega"],
            ].map(([number, label]) => (
              <View key={number} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{number}</Text>
                </View>
                <Text style={styles.stepText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </PediuReveal>

      <Card style={styles.searchCard}>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={22} color={PEDIU.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar arroz, leite, frutas..."
            placeholderTextColor={PEDIU.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <PediuPressable
              onPress={() => setQuery("")}
              style={styles.clearSearch}
            >
              <MaterialIcons name="close" size={18} color={PEDIU.muted} />
            </PediuPressable>
          ) : null}
        </View>
        <View style={styles.deliveryNotice}>
          <MaterialIcons name="home" size={17} color={PEDIU.green} />
          <Text style={styles.deliveryNoticeText}>
            Entrega na sua residência · endereço confirmado no checkout
          </Text>
        </View>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cats}
      >
        {cats.map((category) => (
          <PediuPressable
            key={category}
            onPress={() => setCat(category)}
            style={[styles.chip, cat === category && styles.chipOn]}
          >
            <Text
              style={[styles.chipText, cat === category && styles.chipTextOn]}
            >
              {category}
            </Text>
          </PediuPressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>CATÁLOGO LOCAL</Text>
          <Text style={styles.sectionTitle}>O que falta na despensa?</Text>
        </View>
        <Text style={styles.storeCount}>
          {stores} {stores === 1 ? "mercado" : "mercados"}
        </Text>
      </View>

      {notice ? (
        <PediuPressable onPress={() => setNotice("")} style={styles.notice}>
          <MaterialIcons
            name={notice.includes("foi para") ? "check-circle" : "info"}
            size={18}
            color={notice.includes("foi para") ? PEDIU.green : PEDIU.coral}
          />
          <Text
            style={[
              styles.noticeText,
              {
                color: notice.includes("foi para") ? PEDIU.green : PEDIU.coral,
              },
            ]}
          >
            {notice}
          </Text>
        </PediuPressable>
      ) : null}

      {marketplaceQuery.isLoading ? (
        <Card>
          <ActivityIndicator color={PEDIU.coral} />
        </Card>
      ) : marketplaceQuery.isError ? (
        <Card>
          <EmptyState
            icon="cloud-off"
            title="Mercado indisponível"
            body={marketplaceQuery.error.message}
            actionLabel="Tentar novamente"
            onAction={() => void marketplaceQuery.refetch()}
          />
        </Card>
      ) : items.length ? (
        <View style={styles.grid}>
          {items.map((item, index) => {
            const unitLine = unitSubtitle(item.saleUnit, item.packSize);
            const image = item.adImageUrl
              ? { uri: item.adImageUrl }
              : assetForCategory(item.category, item.id);
            return (
              <PediuReveal
                key={item.id}
                delay={index * 45}
                variant="scaleIn"
                style={styles.cellWrap}
              >
                <View style={styles.cell}>
                  <PediuPressable
                    onPress={() =>
                      router.push({
                        pathname: "/product/[id]",
                        params: { id: String(item.id) },
                      })
                    }
                    style={styles.productPress}
                  >
                    <View style={styles.imageWrap}>
                      <Image
                        source={image}
                        style={styles.cellImg}
                        resizeMode="cover"
                      />
                      <View style={styles.imageScrim} />
                      {item.flashEnabled ? (
                        <View style={styles.flashPill}>
                          <MaterialIcons
                            name="bolt"
                            size={13}
                            color={PEDIU_TOKENS.accentFg}
                          />
                          <Text style={styles.flashText}>Flash</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cellBody}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {item.storeName}
                      </Text>
                      <Text style={styles.cellName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {unitLine ? (
                        <Text style={styles.cellUnit}>{unitLine}</Text>
                      ) : null}
                      <Text style={styles.cellPrice}>
                        {formatCatalogPrice(
                          item.price,
                          item.saleUnit,
                          item.packSize,
                        )}
                      </Text>
                    </View>
                  </PediuPressable>
                  <PediuPressable
                    onPress={() => addQuick(item)}
                    style={styles.addButton}
                  >
                    <MaterialIcons name="add" size={20} color={PEDIU.white} />
                    <Text style={styles.addButtonText}>Adicionar</Text>
                  </PediuPressable>
                </View>
              </PediuReveal>
            );
          })}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon="shopping-cart"
            title="Nenhum produto nesta busca"
            body="Peça ao seu mercado local para publicar produtos nesta categoria ou tente outra busca."
            actionLabel="Limpar filtros"
            onAction={() => {
              setCat("Tudo");
              setQuery("");
            }}
          />
        </Card>
      )}

      <View style={styles.handoff}>
        <View style={styles.handoffIcon}>
          <MaterialIcons name="two-wheeler" size={22} color={PEDIU.white} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.handoffTitle}>
            Mercado separa. O Pediu entrega.
          </Text>
          <Text style={styles.handoffBody}>
            Depois de confirmar, o pedido entra na fila da loja e pode ser
            encaminhado ao radar de um entregador parceiro.
          </Text>
        </View>
      </View>

      {itemCount > 0 ? (
        <View style={styles.stickyCart}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyLabel}>
              {itemCount} {itemCount === 1 ? "item" : "itens"} · {cartStoreName}
            </Text>
            <Text style={styles.stickyTotal}>
              {money(subtotal)}{" "}
              <Text style={styles.stickyHint}>+ entrega calculada</Text>
            </Text>
          </View>
          <PrimaryButton
            title="Ver sacola"
            onPress={() => router.push("/cart")}
            style={styles.stickyButton}
          />
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  cartAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PEDIU.ink,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  cartActionText: { color: PEDIU.white, fontWeight: "900", fontSize: 13 },
  hero: {
    backgroundColor: PEDIU.ink,
    borderRadius: 28,
    padding: 20,
    gap: 10,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PEDIU.yellow,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: {
    color: PEDIU.ink,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PEDIU.green,
  },
  heroTitle: {
    color: PEDIU.white,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    maxWidth: 300,
  },
  heroBody: {
    color: "rgba(255,244,232,0.76)",
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 325,
  },
  steps: { flexDirection: "row", gap: 8, marginTop: 7 },
  step: { flex: 1, gap: 5 },
  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: PEDIU.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { color: PEDIU.white, fontWeight: "900", fontSize: 12 },
  stepText: {
    color: "rgba(255,244,232,0.84)",
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "800",
  },
  searchCard: { padding: 12, gap: 9 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PEDIU.canvas,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 49,
  },
  searchInput: {
    flex: 1,
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 14,
  },
  clearSearch: { padding: 4 },
  deliveryNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 3,
  },
  deliveryNoticeText: {
    color: PEDIU.green,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 11,
    fontWeight: "800",
    flex: 1,
  },
  cats: { gap: 8, paddingVertical: 2 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: PEDIU.white,
    borderWidth: 1,
    borderColor: PEDIU.line,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: PEDIU.coral, borderColor: PEDIU.coral },
  chipText: {
    color: PEDIU.muted,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextOn: { color: PEDIU.white },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 3,
  },
  sectionEyebrow: {
    color: PEDIU.coral,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  sectionTitle: {
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 2,
  },
  storeCount: {
    color: PEDIU.muted,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 11,
    fontWeight: "800",
    paddingBottom: 3,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PEDIU.white,
    borderWidth: 1,
    borderColor: PEDIU.line,
    borderRadius: 15,
    padding: 11,
  },
  noticeText: {
    flex: 1,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cellWrap: { width: "48%" },
  cell: {
    backgroundColor: PEDIU.white,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PEDIU.line,
    shadowColor: PEDIU.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  productPress: { overflow: "hidden" },
  imageWrap: { height: 122, position: "relative" },
  cellImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,17,0.1)",
  },
  flashPill: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PEDIU.yellow,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  flashText: {
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "900",
  },
  cellBody: { padding: 11, gap: 3 },
  storeName: {
    color: PEDIU.coral,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "900",
  },
  cellName: {
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  cellUnit: {
    color: PEDIU.muted,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "700",
  },
  cellPrice: {
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  addButton: {
    minHeight: 39,
    backgroundColor: PEDIU.coral,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    margin: 8,
    marginTop: 0,
    borderRadius: 13,
  },
  addButtonText: {
    color: PEDIU.white,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 11,
    fontWeight: "900",
  },
  handoff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PEDIU.ink,
    borderRadius: 22,
    padding: 15,
    marginTop: 4,
  },
  handoffIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: PEDIU.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  handoffTitle: {
    color: PEDIU.white,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 16,
    fontWeight: "900",
  },
  handoffBody: {
    color: "rgba(255,244,232,0.72)",
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 11,
    lineHeight: 16,
  },
  stickyCart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: PEDIU.white,
    borderWidth: 1,
    borderColor: PEDIU.line,
    borderRadius: 22,
    padding: 10,
    marginTop: 2,
    shadowColor: PEDIU.ink,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stickyLabel: {
    color: PEDIU.muted,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "800",
  },
  stickyTotal: {
    color: PEDIU.ink,
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 18,
    fontWeight: "900",
  },
  stickyHint: {
    color: PEDIU.muted,
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "700",
  },
  stickyButton: { minHeight: 44, borderRadius: 15, paddingHorizontal: 13 },
});
