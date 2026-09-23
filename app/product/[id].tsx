import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/providers/cart-provider";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const query = trpc.pediu.marketplace.products.useQuery(undefined, { enabled: Number.isInteger(productId) && productId > 0, staleTime: 30_000 });
  const product = useMemo(() => (query.data ?? []).find((item) => item.id === productId), [query.data, productId]);
  const { addItem, itemCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");

  if (!Number.isInteger(productId) || productId <= 0) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Produto inválido</Text><Text style={s.muted}>Não foi possível identificar o produto solicitado.</Text></Card></Page>;
  if (query.isLoading) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Carregando produto...</Text><Text style={s.muted}>Buscando disponibilidade e preço atuais.</Text></Card></Page>;
  if (query.isError || !product) return <Page title="Produto" eyebrow="CATÁLOGO"><Card><Text style={s.sectionTitle}>Produto indisponível</Text><Text style={s.muted}>O produto pode ter sido removido, estar indisponível ou a loja estar fechada.</Text></Card></Page>;

  const addToCart = () => {
    const result = addItem({
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      storeName: product.storeName,
      category: product.category,
      description: product.description,
      price: String(product.price),
      deliveryFee: String(product.deliveryFee ?? "0.00"),
      emoji: product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : "🛠️",
    }, quantity);
    if (!result.ok) {
      setNotice(result.error ?? "Não foi possível adicionar o produto.");
      return;
    }
    setNotice(`${quantity} item(ns) adicionado(s) ao carrinho.`);
  };

  return <Page title={product.name} eyebrow={product.storeName} back action={<Pressable onPress={() => router.push("/cart")}><Text style={{ color: PEDIU.coral, fontWeight: "900" }}>Carrinho ({itemCount})</Text></Pressable>}>
    <Card>
      <View style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 58 }}>{product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : "🛠️"}</Text>
      </View>
      <Text style={s.sectionTitle}>{product.name}</Text>
      <Text style={s.muted}>{product.description || "Produto disponível para pedido."}</Text>
      <Text style={{ color: PEDIU.coral, fontSize: 22, fontWeight: "900" }}>R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text>
      <Text style={s.muted}>{product.available ? "Disponível agora" : "Indisponível"} · {product.category}</Text>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Quantidade</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable disabled={quantity <= 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center", opacity: quantity <= 1 ? 0.4 : 1 }}><Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>−</Text></Pressable>
        <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>{quantity}</Text>
        <Pressable onPress={() => setQuantity((current) => Math.min(50, current + 1))} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center" }}><Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>+</Text></Pressable>
      </View>
      {notice ? <Text style={{ color: notice.includes("adicionado") ? PEDIU.green : PEDIU.coral, fontSize: 12 }}>{notice}</Text> : null}
      <PrimaryButton title={product.available ? "Adicionar ao carrinho" : "Produto indisponível"} disabled={!product.available} onPress={addToCart} />
      {itemCount > 0 ? <Pressable onPress={() => router.push("/cart")}><Text style={{ color: PEDIU.ink, fontWeight: "900", textAlign: "center" }}>Ver carrinho</Text></Pressable> : null}
    </Card>
  </Page>;
}
