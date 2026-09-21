import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const query = trpc.pediu.marketplace.products.useQuery(undefined, { enabled: Number.isInteger(productId) && productId > 0, staleTime: 30_000 });
  const product = useMemo(() => (query.data ?? []).find((item) => item.id === productId), [query.data, productId]);

  if (!Number.isInteger(productId) || productId <= 0) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Produto inválido</Text><Text style={s.muted}>Não foi possível identificar o produto solicitado.</Text></Card></Page>;
  if (query.isLoading) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Carregando produto...</Text></Card></Page>;
  if (query.isError || !product) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Produto indisponível</Text><Text style={s.muted}>O produto pode ter sido removido, estar indisponível ou a loja estar fechada.</Text></Card></Page>;

  return <Page title={product.name} eyebrow={product.storeName}>
    <Card>
      <View style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 58 }}>{product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : "🛠️"}</Text>
      </View>
      <Text style={s.sectionTitle}>{product.name}</Text>
      <Text style={s.muted}>{product.description || "Produto disponível para pedido."}</Text>
      <Text style={{ color: PEDIU.coral, fontSize: 22, fontWeight: "900" }}>R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text>
      <Text style={s.muted}>{product.available ? "Disponível agora" : "Indisponível"} · {product.category}</Text>
    </Card>
  </Page>;
}
