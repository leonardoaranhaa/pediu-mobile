import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <View style={{ gap: 8 }}><Text style={s.label}>{label}</Text><View style={{ flexDirection: "row", gap: 8 }}>{[1,2,3,4,5].map((n) => <Pressable key={n} onPress={() => onChange(n)}><Text style={{ fontSize: 30, color: n <= value ? PEDIU.coral : PEDIU.line }}>★</Text></Pressable>)}</View></View>;
}

export default function FeedbackScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [store, setStore] = useState(0); const [product, setProduct] = useState(0); const [driver, setDriver] = useState(0); const [comment, setComment] = useState("");
  return <Page title="Como foi seu pedido?" eyebrow={`PEDIDO #${orderId}`} back>
    <Card><Rating label="Estabelecimento" value={store} onChange={setStore} /><Rating label="Produtos" value={product} onChange={setProduct} /><Rating label="Entregador" value={driver} onChange={setDriver} /><TextInput value={comment} onChangeText={setComment} placeholder="Conte como foi sua experiência (opcional)" multiline style={{ minHeight: 100, borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, textAlignVertical: "top", color: PEDIU.text }} /><PrimaryButton title="Enviar avaliação" onPress={() => {}} disabled={!store || !product} /></Card>
  </Page>;
}
