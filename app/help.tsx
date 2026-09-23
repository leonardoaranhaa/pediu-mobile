import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";

const FAQ = [
  ["Onde está meu pedido?", "Abra o pedido no histórico para acompanhar o status e, quando disponível, o rastreio."],
  ["Meu pagamento falhou", "Verifique o método selecionado e tente novamente. Cobranças PIX devem ser confirmadas pelo provedor."],
  ["Quero cancelar um pedido", "O cancelamento depende do estado atual do pedido e das regras da loja."],
];

export default function HelpScreen() {
  return <Page title="Ajuda e suporte" eyebrow="ATENDIMENTO" back>
    <View style={{ gap: 10 }}>{FAQ.map(([q, a]) => <Card key={q}><Text style={s.sectionTitle}>{q}</Text><Text style={s.muted}>{a}</Text></Card>)}</View>
    <Pressable onPress={() => router.push("/support" as never)} style={{ backgroundColor: PEDIU.coral, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 10 }}><Text style={{ color: PEDIU.white, fontWeight: "900" }}>Falar com suporte</Text></Pressable>
  </Page>;
}
