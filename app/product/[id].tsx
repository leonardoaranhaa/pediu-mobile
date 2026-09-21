import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { PressFeedback } from "@/components/pediu-interaction";
import { ErrorState, LoadingState } from "@/components/pediu-feedback";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/lib/cart-store";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const cart = useCart();
  const query = trpc.pediu.marketplace.products.useQuery(undefined, { enabled: Number.isInteger(productId) && productId > 0, staleTime: 30_000 });
  const product = useMemo(() => (query.data ?? []).find((item) => item.id === productId), [query.data, productId]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  if (!Number.isInteger(productId) || productId <= 0) return <Page title="Produto" eyebrow="CATÁLOGO" back><ErrorState title="Produto inválido" description="Não foi possível identificar o produto solicitado." /></Page>;
  if (query.isLoading) return <Page title="Produto" eyebrow="CATÁLOGO" back><LoadingState label="Carregando produto..." /></Page>;
  if (query.isError || !product) return <Page title="Produto" eyebrow="CATÁLOGO" back><ErrorState title="Produto indisponível" description="O produto pode ter sido removido ou estar indisponível." onRetry={() => query.refetch()} /></Page>;

  const total = Number(product.price) * quantity;
  const add = () => {
    cart.addItem({ productId: Number(product.id), storeId: Number(product.storeId), name: product.name, price: Number(product.price), imageUrl: product.imageUrl }, quantity);
    router.push("/cart");
  };

  return <Page title={product.name} eyebrow={product.storeName} back>
    <Card>
      <View style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 58 }}>{product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : "🛍️"}</Text></View>
      <Text style={s.sectionTitle}>{product.name}</Text>
      <Text style={s.muted}>{product.description || "Produto disponível para pedido."}</Text>
      <Text style={{ color: PEDIU.coral, fontSize: 22, fontWeight: "900", marginTop: 8 }}>R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text>
      <Text style={s.muted}>{product.available ? "Disponível agora" : "Indisponível"} · {product.category}</Text>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Quantidade</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 }}><PressFeedback onPress={() => setQuantity((q) => Math.max(1, q - 1))}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: PEDIU.canvas, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22, fontWeight: "900" }}>−</Text></View></PressFeedback><Text style={{ fontSize: 20, fontWeight: "900" }}>{quantity}</Text><PressFeedback onPress={() => setQuantity((q) => q + 1)}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22, fontWeight: "900", color: PEDIU.white }}>+</Text></View></PressFeedback></View>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Observação</Text>
      <TextInput value={note} onChangeText={setNote} placeholder="Ex.: sem cebola, ponto da carne..." multiline accessibilityLabel="Observação do produto" style={{ marginTop: 10, minHeight: 90, borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, textAlignVertical: "top", color: PEDIU.text }} />
    </Card>
    <Card>
      <Text style={s.muted}>Total do item</Text><Text style={{ fontSize: 22, fontWeight: "900", color: PEDIU.ink, marginBottom: 10 }}>R$ {total.toFixed(2).replace(".", ",")}</Text>
      <PrimaryButton title={`Adicionar · R$ ${total.toFixed(2).replace(".", ",")}`} onPress={add} disabled={!product.available} />
    </Card>
  </Page>;
}