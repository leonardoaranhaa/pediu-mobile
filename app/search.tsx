import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Page, PEDIU, s } from "@/components/pediu-page";
import { assetForCategory, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";
import { formatCatalogPrice } from "@/shared/market-units";

const PAGE_SIZE = 12;
const VERTICALS = [
  { id: "all", label: "Tudo" },
  { id: "restaurant", label: "Comida" },
  { id: "market", label: "Mercado" },
  { id: "service", label: "Serviços" },
] as const;
const QUICK = ["Flash", "Pizza", "Hortifruti", "Açaí", "Lanches"];

function parsePrice(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [vertical, setVertical] =
    useState<(typeof VERTICALS)[number]["id"]>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showPrice, setShowPrice] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    vertical: "all" as (typeof VERTICALS)[number]["id"],
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
  });
  const [page, setPage] = useState(0);

  const flashHint = filters.query.trim().toLowerCase() === "flash";
  const productsQuery = trpc.pediu.marketplace.search.useQuery(
    {
      query: flashHint ? undefined : filters.query || undefined,
      flash: flashHint || undefined,
      vertical: filters.vertical === "all" ? undefined : filters.vertical,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const products = productsQuery.data?.items ?? [];
  const hasQuery =
    filters.query.trim().length > 0 ||
    filters.vertical !== "all" ||
    filters.minPrice != null ||
    filters.maxPrice != null;

  const applyFilters = (nextQuery = query, nextVertical = vertical) => {
    setPage(0);
    setFilters({
      query: nextQuery.trim(),
      vertical: nextVertical,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
    });
  };

  const clearSearch = () => {
    setQuery("");
    setVertical("all");
    setMinPrice("");
    setMaxPrice("");
    setPage(0);
    setFilters({
      query: "",
      vertical: "all",
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  return (
    <Page title="Buscar" eyebrow="DESCUBRA" back={false}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={PEDIU_TOKENS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => applyFilters()}
            placeholder="O que você quer pedir?"
            returnKeyType="search"
            autoFocus
            placeholderTextColor={PEDIU_TOKENS.subtle}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <MaterialIcons
                name="close"
                size={18}
                color={PEDIU_TOKENS.muted}
              />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.tasteBtn}
          onPress={() => router.push("/taste")}
        >
          <MaterialIcons
            name="auto-awesome"
            size={20}
            color={PEDIU_TOKENS.accentFg}
          />
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {VERTICALS.map((item) => {
          const on = vertical === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setVertical(item.id);
                applyFilters(query, item.id);
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowPrice((v) => !v)}
          style={[styles.chip, showPrice && styles.chipOn]}
        >
          <MaterialIcons
            name="tune"
            size={14}
            color={showPrice ? PEDIU_TOKENS.white : PEDIU_TOKENS.muted}
          />
          <Text style={[styles.chipText, showPrice && styles.chipTextOn]}>
            Preço
          </Text>
        </Pressable>
      </View>

      {showPrice ? (
        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Filtrar por preço</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="decimal-pad"
              placeholder="Mínimo"
              placeholderTextColor={PEDIU_TOKENS.subtle}
              style={[s.input, { flex: 1 }]}
            />
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="decimal-pad"
              placeholder="Máximo"
              placeholderTextColor={PEDIU_TOKENS.subtle}
              style={[s.input, { flex: 1 }]}
            />
          </View>
          <Pressable style={styles.applyBtn} onPress={() => applyFilters()}>
            <Text style={styles.applyText}>Aplicar</Text>
          </Pressable>
        </View>
      ) : null}

      {!hasQuery ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionLabel}>Atalhos</Text>
          <View style={styles.chipRow}>
            {QUICK.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setQuery(item);
                  applyFilters(item);
                }}
                style={styles.quickChip}
              >
                <Text style={styles.quickText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {flashHint ? (
        <View style={styles.flashBanner}>
          <MaterialIcons name="bolt" size={16} color={PEDIU_TOKENS.accentFg} />
          <Text style={styles.flashBannerText}>
            Flash — lojas com entrega rápida no servidor.
          </Text>
        </View>
      ) : null}

      {productsQuery.isError ? (
        <EmptyState
          icon="wifi-off"
          title="Não foi possível buscar"
          body="Tente de novo em instantes."
          actionLabel="Tentar novamente"
          onAction={() => void productsQuery.refetch()}
        />
      ) : null}

      {productsQuery.isLoading ? (
        <ActivityIndicator color={PEDIU.coral} />
      ) : null}

      {!productsQuery.isLoading && !products.length && hasQuery ? (
        <EmptyState
          icon="search-off"
          title="Nada por aqui"
          body="Ajuste o termo, troque a vertical ou limpe o filtro de preço."
          actionLabel="Limpar busca"
          onAction={clearSearch}
        />
      ) : null}

      {!productsQuery.isLoading && !products.length && !hasQuery ? (
        <Text style={s.muted}>Digite ou escolha um atalho para começar.</Text>
      ) : null}

      {products.map((item) => (
        <Pressable
          key={item.id}
          onPress={() =>
            router.push({
              pathname: "/product/[id]",
              params: { id: String(item.id) },
            })
          }
          style={({ pressed }) => [
            styles.resultCard,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Image
            source={assetForCategory(item.category, item.id)}
            style={styles.resultImg}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.resultName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.resultMeta} numberOfLines={1}>
              {item.storeName} ·{" "}
              {item.storeKind === "market" ? "Mercado" : item.category}
              {item.flashEnabled ? " · Flash" : ""}
            </Text>
            <Text style={styles.resultPrice}>
              {formatCatalogPrice(item.price, item.saleUnit, item.packSize)}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={PEDIU_TOKENS.subtle}
          />
        </Pressable>
      ))}

      {productsQuery.data?.hasMore ? (
        <Pressable
          style={styles.applyBtn}
          onPress={() => setPage((current) => current + 1)}
        >
          <Text style={styles.applyText}>Mais resultados</Text>
        </Pressable>
      ) : null}
      {page > 0 ? (
        <Pressable
          onPress={() => setPage((current) => Math.max(0, current - 1))}
        >
          <Text
            style={{
              color: PEDIU.coral,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Resultados anteriores
          </Text>
        </Pressable>
      ) : null}
    </Page>
  );
}

const styles = {
  searchRow: {
    flexDirection: "row" as const,
    gap: 8,
    alignItems: "center" as const,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: PEDIU_TOKENS.surface,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    paddingHorizontal: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: PEDIU_TOKENS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  tasteBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: PEDIU_TOKENS.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chipRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: PEDIU_TOKENS.surface,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  chipOn: {
    backgroundColor: PEDIU_TOKENS.primary,
    borderColor: PEDIU_TOKENS.primary,
  },
  chipText: {
    color: PEDIU_TOKENS.muted,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  chipTextOn: { color: PEDIU_TOKENS.white },
  priceCard: {
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    padding: 14,
    gap: 10,
  },
  priceTitle: {
    color: PEDIU_TOKENS.ink,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  applyBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: PEDIU_TOKENS.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  applyText: {
    color: PEDIU_TOKENS.white,
    fontWeight: "800" as const,
    fontSize: 13,
  },
  sectionLabel: {
    color: PEDIU_TOKENS.ink,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  quickChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: PEDIU_TOKENS.surface2,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    justifyContent: "center" as const,
  },
  quickText: {
    color: PEDIU_TOKENS.ink,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  flashBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: PEDIU_TOKENS.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flashBannerText: {
    color: PEDIU_TOKENS.accentFg,
    fontSize: 12,
    fontWeight: "700" as const,
    flex: 1,
  },
  resultCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    padding: 10,
  },
  resultImg: { width: 64, height: 64, borderRadius: 16 },
  resultName: {
    color: PEDIU_TOKENS.ink,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  resultMeta: { color: PEDIU_TOKENS.muted, fontSize: 12 },
  resultPrice: {
    color: PEDIU_TOKENS.primary,
    fontSize: 14,
    fontWeight: "900" as const,
    marginTop: 2,
  },
};
