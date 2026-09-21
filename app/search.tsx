import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";
import { PressFeedback, Stagger } from "@/components/pediu-interaction";
import { EmptyState, ErrorState, LoadingState } from "@/components/pediu-feedback";
import { trpc } from "@/lib/trpc";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tudo");
  const productsQuery = trpc.pediu.marketplace.products.useQuery({ category }, { staleTime: 30_000 });
  const products = useMemo(() => (productsQuery.data ?? []).filter((p) => `${p.name} ${p.storeName} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase())), [productsQuery.data, query]);
  return <Page title="Buscar" eyebrow="DESCUBRA" back>
    <TextInput value={query} onChangeText={setQuery} placeholder="O que você está procurando?" autoFocus accessibilityLabel="Buscar produtos e estabelecimentos" style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 16, padding: 14, color: PEDIU.text, backgroundColor: PEDIU.white }} />
    <View style={{ flexDirection: "row", gap: 8, marginVertical: 14 }}>
      {["Tudo", "Doces", "Lanches", "Serviços"].map((item) => <PressFeedback key={item} onPress={() => setCategory(item)}><View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: category === item ? PEDIU.coral : PEDIU.white, borderWidth: 1, borderColor: PEDIU.line }}><Text style={{ color: category === item ? PEDIU.white : PEDIU.text, fontWeight: "700" }}>{item}</Text></View></PressFeedback>)}
    </View>
    {productsQuery.isLoading ? <LoadingState label="Buscando produtos..." /> : productsQuery.isError ? <ErrorState title="Não foi possível buscar" onRetry={() => productsQuery.refetch()} /> : products.length === 0 ? <EmptyState title="Nenhum resultado encontrado" description="Tente outro termo ou escolha outra categoria." /> : <FlatList data={products} keyExtractor={(item) => String(item.id)} renderItem={({ item, index }) => <Stagger index={index}><PressFeedback onPress={() => router.push({ pathname: "/store/[id]", params: { id: String(item.storeId) } })}><Card><Text style={s.sectionTitle}>{item.name}</Text><Text style={s.muted}>{item.storeName} · {item.category}</Text><Text style={{ color: PEDIU.coral, fontSize: 17, fontWeight: "900", marginTop: 8 }}>R$ {Number(item.price).toFixed(2).replace(".", ",")}</Text></Card></PressFeedback></Stagger>} />}
  </Page>;
}