import { useState } from "react";
import { Text, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function OrderCouponPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(false);
  return <Page title="Cupom de desconto" eyebrow="BENEFÍCIOS">
    <Card>
      <Text style={s.body}>Pedido #{orderId}</Text>
      <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Digite seu cupom" style={s.input} />
      <PrimaryButton title={applied ? "Cupom aplicado" : "Aplicar cupom"} disabled={!code.trim() || applied} onPress={() => setApplied(true)} />
      {applied && <Text style={s.muted}>Cupom reservado para validação no checkout.</Text>}
    </Card>
  </Page>;
}
