import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

const METHODS = [{ id: "pix", label: "PIX" }, { id: "card", label: "Cartão" }, { id: "cash", label: "Pagamento na entrega" }] as const;

export default function CheckoutScreen() {
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("pix");
  return <Page title="Finalizar pedido" eyebrow="CHECKOUT" back>
    <Card><Text style={s.sectionTitle}>Endereço de entrega</Text><TextInput value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text }} /></Card>
    <Card><Text style={s.sectionTitle}>Forma de entrega</Text><Text style={s.muted}>Entrega padrão</Text></Card>
    <Card><Text style={s.sectionTitle}>Pagamento</Text><View style={{ gap: 8 }}>{METHODS.map((item) => <Pressable key={item.id} onPress={() => setMethod(item.id)} style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: method === item.id ? PEDIU.coral : PEDIU.line }}><Text style={{ fontWeight: "800", color: PEDIU.text }}>{item.label}</Text></Pressable>)}</View></Card>
    <Card><Text style={s.sectionTitle}>Resumo</Text><Text style={s.muted}>Subtotal: calculado pelo servidor</Text><Text style={s.muted}>Entrega: calculada pelo servidor</Text><Text style={{ color: PEDIU.ink, fontSize: 21, fontWeight: "900", marginTop: 8 }}>Total: calculado no checkout</Text></Card>
    <PrimaryButton title="Confirmar pedido" onPress={() => router.push("/orders" as never)} disabled={!address.trim()} />
  </Page>;
}
