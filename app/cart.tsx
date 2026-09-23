import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Card, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useCart } from "@/providers/cart-provider";

function money(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function CartPage() {
  const { items, hydrated, error, subtotal, deliveryFee, total, itemCount, updateQuantity, updateNote, removeItem, clear } = useCart();

  if (!hydrated) return <Page title="Seu carrinho" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Restaurando carrinho...</Text><Text style={s.muted}>Carregando os itens salvos neste dispositivo.</Text></Card></Page>;

  return <Page title="Seu carrinho" eyebrow="PEDIDO" back>
    {error ? <Card><Text style={{ color: PEDIU.coral, fontWeight: "800" }}>{error}</Text></Card> : null}
    {!items.length ? <Card><Text style={{ fontSize: 40 }}>🛍️</Text><Text style={s.sectionTitle}>Seu carrinho está vazio</Text><Text style={s.muted}>Abra um produto no catálogo e adicione itens para começar.</Text><PrimaryButton title="Explorar produtos" onPress={() => router.replace("/(tabs)" as never)} /></Card> : null}
    {items.length ? <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View><Text style={s.sectionTitle}>{items[0].storeName}</Text><Text style={s.muted}>{itemCount} item(ns)</Text></View>
        <Pressable onPress={clear}><Text style={{ color: PEDIU.coral, fontWeight: "900" }}>Limpar</Text></Pressable>
      </View>
      {items.map((item) => <View key={item.id} style={{ gap: 8, paddingVertical: 13, borderTopWidth: 1, borderTopColor: PEDIU.line }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 28 }}>{item.emoji ?? "🍽️"}</Text>
          <View style={{ flex: 1, gap: 3 }}><Text style={s.sectionTitle}>{item.name}</Text><Text style={s.muted}>{money(Number(item.price))} cada</Text></View>
          <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{money(Number(item.price) * item.quantity)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center" }}><Text style={{ color: PEDIU.ink, fontSize: 18, fontWeight: "900" }}>−</Text></Pressable>
          <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{item.quantity}</Text>
          <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center" }}><Text style={{ color: PEDIU.ink, fontSize: 18, fontWeight: "900" }}>+</Text></Pressable>
          <Pressable onPress={() => removeItem(item.id)} style={{ marginLeft: "auto" }}><Text style={{ color: PEDIU.coral, fontWeight: "800" }}>Remover</Text></Pressable>
        </View>
        <TextInput value={item.note ?? ""} onChangeText={(note) => updateNote(item.id, note)} placeholder="Observação para este item (opcional)" placeholderTextColor={PEDIU.muted} style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 12, padding: 10, color: PEDIU.ink, backgroundColor: PEDIU.canvas }} />
      </View>)}
    </Card> : null}
    {items.length ? <Card>
      <Text style={s.sectionTitle}>Resumo</Text>
      <View style={{ gap: 8 }}><View style={row}><Text style={s.muted}>Subtotal</Text><Text style={value}>{money(subtotal)}</Text></View><View style={row}><Text style={s.muted}>Entrega</Text><Text style={value}>{money(deliveryFee)}</Text></View><View style={[row, { marginTop: 5 }]}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>Total estimado</Text><Text style={{ color: PEDIU.coral, fontSize: 19, fontWeight: "900" }}>{money(total)}</Text></View></View>
      <Text style={s.muted}>O total final será recalculado e confirmado pelo servidor no checkout.</Text>
      <PrimaryButton title="Continuar para checkout" onPress={() => router.push("/checkout")} />
      <OutlineButton title="Continuar escolhendo" onPress={() => router.replace("/(tabs)" as never)} />
    </Card> : null}
  </Page>;
}

const row = { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const };
const value = { color: PEDIU.ink, fontWeight: "800" as const };
