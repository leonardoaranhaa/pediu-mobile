import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const [category, setCategory] = useState("Tudo");
  const query = trpc.pediu.marketplace.products.useQuery({ category }, { staleTime: 30_000 });
  const products = useMemo(() => (query.data ?? []).filter((p) => p.storeId === storeId), [query.data, storeId]);
  const storeName = products[0]?.storeName ?? "Estabelecimento";
  return <Page title={storeName} eyebrow="CATÁLOGO" back>
    <Card><Text style={s.sectionTitle}>Produtos</Text><Text style={s.muted}>Escolha um item para ver detalhes, disponibilidade e adicionar ao carrinho.</Text></Card>
    <View style={{ gap: 10 }}>{products.map((product) => <Card key={product.id}><Text style={s.sectionTitle}>{product.name}</Text><Text style={s.muted}>{product.description || product.category}</Text><Text style={{ color: PEDIU.coral, fontSize: 18, fontWeight: "900", marginVertical: 8 }}>R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text><PrimaryButton title="Adicionar ao carrinho" onPress={() => {}} /></Card>)}</View>
    {!query.isLoading && products.length === 0 && <Text style={s.muted}>Nenhum produto disponível nesta loja.</Text>}
  </Page>;
}
