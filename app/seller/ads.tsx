import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Page, Card, Field, OutlineButton, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/lib/app-preferences";

const tones = [
  { id: "irresistivel" as const, label: "Irresistível", icon: "auto-awesome" as const },
  { id: "caseiro" as const, label: "Caseiro", icon: "home" as const },
  { id: "premium" as const, label: "Premium", icon: "diamond" as const },
  { id: "divertido" as const, label: "Divertido", icon: "sentiment-very-satisfied" as const },
];

type Ad = {
  id: number;
  productId: number | null;
  status: "draft" | "published" | "archived";
  headline: string;
  description: string;
  cta: string;
  offerLabel: string | null;
  imageUrl: string | null;
  createdAt: Date | string;
};

function statusLabel(status: Ad["status"]) {
  if (status === "published") return "Publicado";
  if (status === "archived") return "Arquivado";
  return "Rascunho";
}

function statusColor(status: Ad["status"]) {
  if (status === "published") return PEDIU.green;
  if (status === "archived") return PEDIU.muted;
  return PEDIU.orange;
}

export default function SellerAdsPage() {
  const { isAuthenticated } = useAuth();
  const { theme } = useAppPreferences();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: isAuthenticated });
  const products = trpc.pediu.products.mine.useQuery({ storeId: store.data?.id ?? 0 }, { enabled: Boolean(store.data?.id) });
  const ads = trpc.pediu.ads.mine.useQuery(undefined, { enabled: isAuthenticated && Boolean(store.data?.id) });
  const credits = trpc.pediu.ads.credits.useQuery(undefined, { enabled: isAuthenticated && Boolean(store.data?.id) });
  const [productId, setProductId] = useState("");
  const [offerLabel, setOfferLabel] = useState("");
  const [audience, setAudience] = useState("pessoas do bairro");
  const [tone, setTone] = useState<(typeof tones)[number]["id"]>("irresistivel");
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const generate = trpc.pediu.ads.generate.useMutation({
    onSuccess: (ad) => {
      setSelectedAd(ad as Ad);
      void ads.refetch();
      void credits.refetch();
    },
  });
  const publish = trpc.pediu.ads.publish.useMutation({
    onSuccess: (ad) => {
      setSelectedAd(ad as Ad);
      void ads.refetch();
    },
  });
  const archive = trpc.pediu.ads.archive.useMutation({ onSuccess: () => { setSelectedAd(null); void ads.refetch(); } });
  const selectedProduct = useMemo(() => products.data?.find((item) => String(item.id) === productId), [productId, products.data]);

  if (!isAuthenticated) {
    return <Page title="Estúdio de anúncios" eyebrow="PEDIU AI"><Card><MaterialIcons name="lock" size={26} color={theme.primary} /><Text style={s.sectionTitle}>Entre para criar anúncios da sua loja</Text><Text style={s.muted}>Os criativos ficam vinculados ao catálogo e à conta do lojista.</Text><PrimaryButton title="Voltar para o painel" onPress={() => router.replace("/seller")} /></Card></Page>;
  }

  if (!store.data) {
    return <Page title="Estúdio de anúncios" eyebrow="PEDIU AI"><Card><Text style={s.sectionTitle}>Crie sua loja primeiro</Text><Text style={s.muted}>Depois de cadastrar a loja e os produtos, você poderá transformar um item real em um anúncio completo.</Text><PrimaryButton title="Abrir minha loja" onPress={() => router.replace("/seller")} /></Card></Page>;
  }

  const submit = () => {
    if (!productId) return;
    generate.mutate({ productId: Number(productId), offerLabel: offerLabel.trim() || undefined, audience: audience.trim() || undefined, tone });
  };

  return <Page title="Estúdio de anúncios" eyebrow="PEDIU AI" action={<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><MaterialIcons name="auto-awesome" size={17} color={theme.primary} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: "900" }}>{credits.data?.balance ?? 0} créditos</Text></View>}>
    <Card style={{ backgroundColor: theme.ink, borderColor: theme.ink }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="auto-awesome" size={22} color={PEDIU.white} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }}>CRIATIVO DA SUA LOJA</Text><Text style={{ color: PEDIU.white, fontSize: 19, fontWeight: "900", marginTop: 3 }}>Venda com os olhos.</Text></View></View>
      <Text style={{ color: "#BCD0D1", fontSize: 13, lineHeight: 19 }}>Escolha um produto. O Pediu cria a ideia, a copy e uma imagem comercial para você revisar antes de publicar.</Text>
    </Card>

    <Card>
      <Text style={s.sectionTitle}>1. Escolha o produto</Text>
      {products.isLoading ? <Text style={s.muted}>Carregando catálogo...</Text> : products.data?.length ? <View style={{ gap: 8 }}>{products.data.map((product) => <Pressable key={product.id} onPress={() => setProductId(String(product.id))} style={{ borderWidth: 1, borderColor: productId === String(product.id) ? theme.primary : theme.line, backgroundColor: productId === String(product.id) ? theme.primarySoft : PEDIU.white, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: PEDIU.peach, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="restaurant" size={19} color={theme.primary} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.ink, fontWeight: "900", fontSize: 13 }}>{product.name}</Text><Text style={s.muted}>{product.category} · R$ {Number(product.price).toFixed(2).replace(".", ",")}</Text></View><MaterialIcons name={productId === String(product.id) ? "radio-button-checked" : "radio-button-unchecked"} size={21} color={productId === String(product.id) ? theme.primary : theme.muted} /></Pressable>)}</View> : <Text style={s.muted}>Adicione um produto no catálogo antes de criar um anúncio.</Text>}
    </Card>

    <Card>
      <Text style={s.sectionTitle}>2. Dê uma direção</Text>
      <Field label="VANTAGEM REAL (OPCIONAL)" value={offerLabel} onChangeText={setOfferLabel} placeholder="Ex.: 10% off no primeiro pedido" maxLength={120} />
      <Text style={s.muted}>Só escreva algo que sua loja realmente vai cumprir. O Pediu não inventa desconto.</Text>
      <Field label="PARA QUEM" value={audience} onChangeText={setAudience} placeholder="Ex.: famílias do bairro" maxLength={120} />
      <Text style={s.label}>CLIMA DO ANÚNCIO</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{tones.map((item) => <Pressable key={item.id} onPress={() => setTone(item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: tone === item.id ? theme.primary : theme.line, backgroundColor: tone === item.id ? theme.primarySoft : PEDIU.white, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 9 }}><MaterialIcons name={item.icon} size={16} color={tone === item.id ? theme.primary : theme.muted} /><Text style={{ color: tone === item.id ? theme.primary : theme.muted, fontSize: 11, fontWeight: "900" }}>{item.label}</Text></Pressable>)}</View>
      {selectedProduct ? <View style={{ backgroundColor: theme.canvas, borderRadius: 14, padding: 12, gap: 3 }}><Text style={s.label}>PRODUTO SELECIONADO</Text><Text style={{ color: theme.ink, fontSize: 14, fontWeight: "900" }}>{selectedProduct.name}</Text><Text style={s.muted}>{selectedProduct.description || "Sem descrição cadastrada."}</Text></View> : null}
      {generate.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{generate.error.message}</Text> : null}
      <PrimaryButton title={generate.isPending ? "Criando criativo..." : "Gerar anúncio com IA"} disabled={generate.isPending || !productId || !credits.data?.balance} onPress={submit} />
      {!credits.data?.balance ? <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "800" }}>Seus créditos acabaram. Em breve você poderá contratar novos pacotes no Pediu.</Text> : null}
    </Card>

    {selectedAd ? <CreativePreview ad={selectedAd} theme={theme} busy={publish.isPending || archive.isPending} onPublish={() => publish.mutate({ adId: selectedAd.id })} onArchive={() => archive.mutate({ adId: selectedAd.id })} /> : null}

    <View style={{ gap: 10 }}><Text style={s.sectionTitle}>Criativos da loja</Text>{ads.isLoading ? <Text style={s.muted}>Carregando seus anúncios...</Text> : ads.data?.length ? ads.data.map((ad) => <Pressable key={ad.id} onPress={() => setSelectedAd(ad as Ad)}><Card style={{ gap: 9 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={s.label}>ANÚNCIO #{ad.id}</Text><Text style={{ color: statusColor(ad.status), fontSize: 11, fontWeight: "900" }}>{statusLabel(ad.status)}</Text></View><Text style={{ color: theme.ink, fontSize: 15, fontWeight: "900" }}>{ad.headline}</Text><Text style={s.muted} numberOfLines={2}>{ad.description}</Text></Card></Pressable>) : <Card><Text style={s.muted}>Seus criativos revisados aparecerão aqui.</Text></Card>}</View>

    <OutlineButton title="Voltar ao painel da loja" onPress={() => router.replace("/seller")} />
  </Page>;
}

function CreativePreview({ ad, theme, busy, onPublish, onArchive }: { ad: Ad; theme: { primary: string; primarySoft: string; ink: string; card: string; line: string; muted: string; highlight: string }; busy: boolean; onPublish: () => void; onArchive: () => void }) {
  return <Card style={{ padding: 0, overflow: "hidden" }}>
    {ad.imageUrl ? <Image source={{ uri: ad.imageUrl }} style={{ width: "100%", height: 220, backgroundColor: PEDIU.peach }} resizeMode="cover" /> : <View style={{ height: 160, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="image" size={42} color={theme.primary} /><Text style={{ color: theme.muted, fontSize: 12, marginTop: 7 }}>Imagem indisponível</Text></View>}
    <View style={{ padding: 17, gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={s.label}>PRÉVIA DO ANÚNCIO</Text><View style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: theme.primary, fontSize: 10, fontWeight: "900" }}>{statusLabel(ad.status)}</Text></View></View><Text style={{ color: theme.ink, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>{ad.headline}</Text><Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{ad.description}</Text>{ad.offerLabel ? <View style={{ backgroundColor: "#FFF5D6", borderRadius: 12, padding: 10, flexDirection: "row", gap: 7, alignItems: "center" }}><MaterialIcons name="local-offer" size={17} color={PEDIU.orange} /><Text style={{ color: theme.ink, fontSize: 12, fontWeight: "900", flex: 1 }}>{ad.offerLabel}</Text></View> : null}<Text style={{ color: theme.primary, fontSize: 13, fontWeight: "900" }}>{ad.cta}</Text>{ad.status === "draft" ? <PrimaryButton title={busy ? "Salvando..." : "Publicar no marketplace"} disabled={busy} onPress={onPublish} /> : ad.status === "published" ? <OutlineButton title={busy ? "Arquivando..." : "Arquivar anúncio"} disabled={busy} onPress={onArchive} /> : null}</View>
  </Card>;
}
