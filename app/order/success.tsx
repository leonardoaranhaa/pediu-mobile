import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card, Page, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { PediuMascot } from "@/components/pediu-mascot";
import { useAppPreferences } from "@/lib/app-preferences";

function money(value: string | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `R$ ${amount.toFixed(2).replace(".", ",")}` : "—";
}

export default function OrderSuccessPage() {
  const { orderId, paymentId, total } = useLocalSearchParams<{ orderId?: string; paymentId?: string; total?: string }>();
  const { theme, customization } = useAppPreferences();
  const validOrder = Boolean(orderId && Number.isInteger(Number(orderId)) && Number(orderId) > 0);

  if (!validOrder) {
    return <Page title="Pedido" eyebrow="CONFIRMAÇÃO"><Card><Text style={s.sectionTitle}>Pedido inválido</Text><Text style={s.muted}>Não foi possível identificar o pedido criado.</Text></Card></Page>;
  }

  return <Page title="Pedido confirmado" eyebrow="TUDO CERTO">
    <Card>
      <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Text style={{ color: PEDIU.coral, fontSize: 30, fontWeight: "900" }}>✓</Text></View>
      <Text style={s.sectionTitle}>Recebemos seu pedido</Text>
      <Text style={s.body}>O estabelecimento recebeu a solicitação e poderá atualizar o status a qualquer momento.</Text>
      {customization.mascotEnabled ? <View style={{ alignItems: "center", marginTop: 12, marginBottom: 2 }}><PediuMascot theme={theme} styleId={customization.mascotStyle} reaction="full" motionEnabled={customization.motionEnabled} showSpeech /></View> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: PEDIU.line, marginTop: 16, paddingTop: 16, gap: 6 }}>
        <Text style={s.muted}>Número do pedido</Text>
        <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>#{orderId}</Text>
        <Text style={s.muted}>Total confirmado: {money(total)}</Text>
      </View>
    </Card>
    <PrimaryButton title="Acompanhar pedido" onPress={() => router.replace({ pathname: "/order/track", params: { orderId, paymentId: paymentId ?? "" } })} />
    <OutlineButton title="Voltar para descobrir" onPress={() => router.replace("/(tabs)" as never)} />
  </Page>;
}
