import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Card, OutlineButton, Page, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/lib/app-preferences";

function offerText(type: string, value: string, maxDiscount: string | null) {
  if (type === "percentage") return `${Number(value).toFixed(0)}% de desconto${maxDiscount ? ` até R$ ${Number(maxDiscount).toFixed(2).replace(".", ",")}` : ""}`;
  return `R$ ${Number(value).toFixed(2).replace(".", ",")} de desconto`;
}

export default function CouponsPage() {
  const { theme } = useAppPreferences();
  const coupons = trpc.pediu.coupons.available.useQuery();

  return <Page title="Pediu Vantagens" eyebrow="BENEFÍCIOS">
    <View style={{ backgroundColor: theme.ink, borderRadius: 24, padding: 20, gap: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><MaterialIcons name="local-offer" size={22} color={theme.highlight} /><Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }}>VANTAGENS REAIS</Text></View><Text style={{ color: PEDIU.white, fontSize: 22, fontWeight: "900" }}>Leve uma vantagem no próximo pedido.</Text><Text style={{ color: "#BCD0D1", fontSize: 13, lineHeight: 19 }}>Os cupons abaixo são publicados pelo Pediu e validados pelo servidor no checkout.</Text></View>
    {coupons.isLoading ? <Card><Text style={s.muted}>Buscando cupons ativos...</Text></Card> : coupons.isError ? <Card><Text style={{ color: PEDIU.coral, fontSize: 12 }}>{coupons.error.message}</Text><PrimaryButton title="Tentar novamente" onPress={() => void coupons.refetch()} /></Card> : coupons.data?.length ? <View style={{ gap: 11 }}>{coupons.data.map((coupon) => <Card key={coupon.id}><View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="confirmation-number" size={21} color={theme.primary} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.ink, fontSize: 16, fontWeight: "900" }}>{offerText(coupon.type, coupon.value, coupon.maxDiscount)}</Text><Text style={s.muted}>Código: <Text style={{ color: theme.primary, fontWeight: "900" }}>{coupon.code}</Text></Text>{Number(coupon.minSubtotal) > 0 ? <Text style={s.muted}>Válido em pedidos a partir de R$ {Number(coupon.minSubtotal).toFixed(2).replace(".", ",")}</Text> : null}{coupon.expiresAt ? <Text style={s.muted}>Válido até {new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}</Text> : null}</View></View><PrimaryButton title="Usar no checkout" onPress={() => router.push({ pathname: "/checkout", params: { coupon: coupon.code } })} /></Card>)}</View> : <Card><MaterialIcons name="redeem" size={26} color={theme.primary} /><Text style={s.sectionTitle}>Nenhuma vantagem ativa agora</Text><Text style={s.muted}>Quando houver uma condição especial disponível, ela aparecerá aqui — sem promessa escondida.</Text></Card>}
    <OutlineButton title="Voltar para descobrir" onPress={() => router.replace("/")} />
  </Page>;
}
