import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { PressFeedback, Stagger } from "@/components/pediu-interaction";
import { EmptyState, ErrorState, LoadingState } from "@/components/pediu-feedback";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/lib/cart-store";

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const [category, setCategory] = useState("Tudo");
  const cart = useCart();
  const query = trpc.pediu.marketplace.products.useQuery({ category }, { staleTime: 30_000 });
  const products = useMemo(() => (query.data ?? []).filter((p) => p.storeId === storeId), [query.data, storeId]);
  const storeName = products[0]?.storeName ?? "Estabelecimento";
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const visible = category === "Tudo" ? products : products.filter((p) => p.category === category);
  return <Page title={storeName} eyebrow="CATÁLOGO" back>
    <Card><Text style={s.sectionTitle}>Produtos</Text><Text style={s.muted}>Escolha um item para ver detalhes e adicionar ao carrinho.</Text>{cart.items.length > 0 ? <PressFeedback onPress={() => router.push("/cart")}><Text style={{ color: PEDIU.coral, fontWeight: "900", marginTop: 10 }}>{cart.items.reduce((n, i) => n + i.quantity, 0)} item(ns) · Ver carrinho</Text></PressFeedback> : null}</Card>
    {query.isLoading ? <LoadingState label="Carregando catálogo..." /> : query.isError ? <ErrorState title="Não foi possível carregar o catálogo" onRetry={() => query.refetch()} /> : products.length === 0 ? <EmptyState title="Catálogo vazio" description="Este estabelecimento não possui produtos disponíveis no momento." /> : <>
      {categories.length > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 }}><PressFeedback onPress={() => setCategory("Tudo")}><View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: category === "Tudo" ? PEDIU.coral : PEDIU.white, borderWidth: 1, borderColor: PEDIU.line }}><Text style={{ color: category === "Tudo" ? PEDIU.white : PEDIU.text, fontWeight: "700" }}>Tudo</Text></View></PressFeedback>{categories.map((item) => <PressFeedback key={item} onPress={() => setCategory(item)}><View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: category === item ? PEDIU.coral : PEDIU.white, borderWidth: 1, borderColor: PEDIU.line }}><Text style={{ color: category === item ? PEDIU.white : PEDIU.text, fontWeight: "700" }}>{item}</Text></View></PressFeedback>)}</View>}
      {visible.map((product, index) => <Stagger key={product.id} index={index}><Card><Text style={s.sectionTitle}>{product.name}</Text><Text style={s.muted}>{product.description || product.category}</Text><Text style={{ color: PEDIU.coral, fontSize: 18, fontWeight: "900", marginVertical: 8 }}>R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text><PrimaryButton title="Adicionar ao carrinho" onPress={() => cart.addItem({ productId: Number(product.id), storeId: Number(product.storeId), name: product.name, price: Number(product.price), imageUrl: product.imageUrl })} /></Card></Stagger>)}
    </>}
  </Page>;
}