import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";
import { replayHomeTour } from "@/components/home-tour";

const FAQ = [
  ["Onde está meu pedido?", "Abra o pedido no histórico para acompanhar o status e, quando disponível, o rastreio."],
  ["Meu pagamento falhou", "Confira a forma de pagamento e tente de novo. No PIX, conclua o pagamento na hora indicada."],
  ["Quero cancelar um pedido", "O cancelamento depende do estado atual do pedido e das regras da loja."],
];

export default function HelpScreen() {
  return <Page title="Ajuda e suporte" eyebrow="ATENDIMENTO" back>
    <View style={{ gap: 10 }}>{FAQ.map(([q, a]) => <Card key={q}><Text style={s.sectionTitle}>{q}</Text><Text style={s.muted}>{a}</Text></Card>)}</View>
    <Pressable onPress={() => router.push("/support" as never)} style={{ backgroundColor: PEDIU.coral, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 10 }}><Text style={{ color: PEDIU.white, fontWeight: "900" }}>Falar com suporte</Text></Pressable>
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void replayHomeTour().then(() => router.replace("/(tabs)"));
      }}
      style={{ flexDirection: "row", gap: 8, borderRadius: 16, padding: 16, alignItems: "center", justifyContent: "center", marginTop: 4, borderWidth: 1, borderColor: PEDIU.line }}
    >
      <MaterialIcons name="tour" size={20} color={PEDIU.ink} />
      <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>Ver o tour do app de novo</Text>
    </Pressable>
  </Page>;
}
