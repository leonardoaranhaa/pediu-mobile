import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Page, Card, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 12;
const categories = ["Tudo", "Doces", "Lanches", "Serviços"];

function parsePrice(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function money(value: string) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tudo");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filters, setFilters] = useState({ query: "", category: "Tudo", minPrice: undefined as number | undefined, maxPrice: undefined as number | undefined });
  const [page, setPage] = useState(0);
  const productsQuery = trpc.pediu.marketplace.search.useQuery({
    query: filters.query || undefined,
    category: filters.category === "Tudo" ? undefined : filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }, { staleTime: 30_000, refetchOnWindowFocus: false });
  const products = productsQuery.data?.items ?? [];

  const applyFilters = () => {
    setPage(0);
    setFilters({ query: query.trim(), category, minPrice: parsePrice(minPrice), maxPrice: parsePrice(maxPrice) });
  };

  return <Page title="Buscar" eyebrow="DESCUBRA" back>
    <TextInput value={query} onChangeText={setQuery} onSubmitEditing={applyFilters} placeholder="O que você está procurando?" returnKeyType="search" autoFocus style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 16, padding: 14, color: PEDIU.text, backgroundColor: PEDIU.white }} />
    <View style={{ flexDirection: "row", gap: 8, marginVertical: 14, flexWrap: "wrap" }}>
      {categories.map((item) => <Pressable key={item} onPress={() => { setCategory(item); setPage(0); setFilters((current) => ({ ...current, category: item })); }} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: category === item ? PEDIU.coral : PEDIU.white, borderWidth: 1, borderColor: PEDIU.line }}><Text style={{ color: category === item ? PEDIU.white : PEDIU.text, fontWeight: "700" }}>{item}</Text></Pressable>)}
    </View>
    <Card>
      <Text style={s.sectionTitle}>Filtrar por preço</Text>
      <View style={{ flexDirection: "row", gap: 8 }}><TextInput value={minPrice} onChangeText={setMinPrice} keyboardType="decimal-pad" placeholder="Mínimo" placeholderTextColor={PEDIU.muted} style={[s.input, { flex: 1 }]} /><TextInput value={maxPrice} onChangeText={setMaxPrice} keyboardType="decimal-pad" placeholder="Máximo" placeholderTextColor={PEDIU.muted} style={[s.input, { flex: 1 }]} /></View>
      <PrimaryButton title="Aplicar filtros" onPress={applyFilters} />
    </Card>
    {productsQuery.isError ? <Card><Text style={{ color: PEDIU.coral, fontWeight: "800" }}>Não foi possível buscar agora.</Text><PrimaryButton title="Tentar novamente" onPress={() => void productsQuery.refetch()} /></Card> : null}
    <FlatList data={products} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(item.id) } })}><Card><Text style={s.sectionTitle}>{item.name}</Text><Text style={s.muted}>{item.storeName} · {item.category}</Text><Text style={{ color: PEDIU.coral, fontSize: 17, fontWeight: "900", marginTop: 8 }}>{money(item.price)}</Text></Card></Pressable>} ListEmptyComponent={<Text style={s.muted}>{productsQuery.isLoading ? "Buscando..." : "Nenhum resultado encontrado."}</Text>} />
    {productsQuery.data?.hasMore ? <PrimaryButton title="Mais resultados" onPress={() => setPage((current) => current + 1)} /> : null}
    {page > 0 ? <Pressable onPress={() => setPage((current) => current - 1)}><Text style={{ color: PEDIU.coral, fontWeight: "900", textAlign: "center" }}>Voltar para resultados anteriores</Text></Pressable> : null}
  </Page>;
}
