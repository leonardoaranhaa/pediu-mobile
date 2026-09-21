import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Page, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

const SLIDES = [
  { eyebrow: "PEÇA", title: "Tudo o que você precisa, em um só lugar.", body: "Encontre restaurantes, mercados, farmácias e serviços perto de você." },
  { eyebrow: "ACOMPANHE", title: "Seu pedido do começo ao fim.", body: "Receba atualizações e acompanhe a entrega em tempo real." },
  { eyebrow: "VENDA", title: "Seu negócio também cabe no Pediu.", body: "Catálogo, pedidos, clientes e vendas em uma operação simples." },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const finish = async () => {
    await AsyncStorage.setItem("pediu:onboarding-complete", "1");
    router.replace("/login");
  };
  return (
    <Page title="Pediu" eyebrow={slide.eyebrow} back={false}>
      <View style={{ flex: 1, minHeight: 520, justifyContent: "space-between", paddingVertical: 28 }}>
        <View>
          <View style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
            <Text style={{ color: PEDIU.white, fontSize: 64, fontWeight: "900", fontStyle: "italic" }}>p</Text>
          </View>
          <Text style={{ color: PEDIU.ink, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1.2 }}>{slide.title}</Text>
          <Text style={[s.muted, { fontSize: 17, lineHeight: 25, marginTop: 16 }]}>{slide.body}</Text>
        </View>
        <View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {SLIDES.map((_, i) => <View key={i} style={{ width: i === index ? 28 : 8, height: 8, borderRadius: 8, backgroundColor: i === index ? PEDIU.coral : PEDIU.line }} />)}
          </View>
          {index < SLIDES.length - 1 ? <PrimaryButton title="Continuar" onPress={() => setIndex((v) => v + 1)} /> : <PrimaryButton title="Começar" onPress={() => void finish()} />}
          {index < SLIDES.length - 1 && <Pressable onPress={() => void finish()} style={{ alignItems: "center", padding: 14 }}><Text style={{ color: PEDIU.muted, fontWeight: "700" }}>Pular</Text></Pressable>}
        </View>
      </View>
    </Page>
  );
}
