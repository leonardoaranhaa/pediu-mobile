import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Field, Page, PrimaryButton, Row, s } from "@/components/pediu-page";

export default function SellerCatalogPage() {
  const { user } = useAuth();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: user?.role === "merchant" });
  const products = trpc.pediu.products.mine.useQuery({ storeId: store.data?.id ?? 0 }, { enabled: Boolean(store.data?.id), refetchInterval: 15_000 });
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Geral");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const create = trpc.pediu.products.create.useMutation({ onSuccess: () => { setName(""); setCategory("Geral"); setDescription(""); setPrice(""); void products.refetch(); } });
  const availability = trpc.pediu.products.availability.useMutation({ onSuccess: () => void products.refetch() });

  const publish = async () => {
    if (!store.data) return;
    const available = (products.data ?? []).filter((product) => product.available);
    const lines = available.length ? available.map((product) => `• ${product.name} — R$ ${Number(product.price).toFixed(2).replace(".", ",")}`).join("\n") : "Catálogo em atualização.";
    await Share.share({ title: `Catálogo ${store.data.name}`, message: `${store.data.name}\n\nPeça pelo Pediu:\n${lines}` });
  };

  return <Page title="Catálogo" eyebrow="VITRINE" action={<MaterialIcons name="inventory-2" size={22} color="#FF5A4F" />}>
    <Card>
      <Text style={s.sectionTitle}>Novo produto</Text>
      <Field label="NOME" value={name} onChangeText={setName} placeholder="Ex.: Combo X-Bacon" />
      <Field label="CATEGORIA" value={category} onChangeText={setCategory} placeholder="Ex.: Lanches" />
      <Field label="DESCRIÇÃO" value={description} onChangeText={setDescription} placeholder="Detalhes para o cliente" multiline />
      <Field label="PREÇO" value={price} onChangeText={setPrice} placeholder="35.00" keyboardType="decimal-pad" />
      <PrimaryButton title={create.isPending ? "Salvando..." : "Adicionar produto"} disabled={create.isPending || !store.data?.id} onPress={() => { const normalized = price.replace(",", ".").trim(); if (store.data?.id && name.trim().length >= 2 && category.trim().length >= 2 && /^\d+(\.\d{1,2})?$/.test(normalized)) create.mutate({ storeId: store.data.id, name: name.trim(), category: category.trim(), description: description.trim() || undefined, price: normalized }); }} />
      {create.error ? <Text style={{ color: "#FF5A4F", fontSize: 12 }}>{create.error.message}</Text> : null}
    </Card>
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={s.sectionTitle}>Produtos publicados</Text><Text style={s.muted}>{products.data?.length ?? 0}</Text></View>
      {products.isLoading ? <Text style={s.muted}>Carregando catálogo...</Text> : null}
      {products.isError ? <Text style={{ color: "#FF5A4F", fontSize: 12 }}>{products.error.message}</Text> : null}
      {!products.isLoading && !products.data?.length ? <Text style={s.muted}>Seu catálogo está vazio.</Text> : null}
      {products.data?.map((product) => <Row key={product.id} icon="inventory-2" title={product.name} subtitle={`${product.category} · R$ ${Number(product.price).toFixed(2).replace(".", ",")}${product.description ? ` · ${product.description}` : ""}`} right={<Pressable onPress={() => availability.mutate({ productId: product.id, available: !product.available })} style={{ padding: 4 }}><Text style={{ color: product.available ? "#36B878" : "#7C8A8F", fontWeight: "900", fontSize: 11 }}>{product.available ? "ATIVO" : "PAUSADO"}</Text></Pressable>} />)}
    </Card>
    <Card><Row icon="campaign" title="Divulgar catálogo" subtitle="Compartilhe os produtos ativos da sua loja" onPress={() => void publish()} /></Card>
  </Page>;
}
