import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { PressFeedback } from "@/components/pediu-interaction";
import { EmptyState } from "@/components/pediu-feedback";
import { useCart } from "@/lib/cart-store";

export default function CartScreen() {
  const cart = useCart();
  if (!cart.items.length) return <Page title="Seu carrinho" eyebrow="CARRINHO" back><EmptyState title="Seu carrinho está vazio" description="Adicione produtos de um estabelecimento para começar." /><PrimaryButton title="Explorar produtos" onPress={() => router.push("/search")} /></Page>;
  return <Page title="Seu carrinho" eyebrow="CARRINHO" back>
    {cart.items.map((item) => <Card key={item.productId}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1 }}><Text style={s.sectionTitle}>{item.name}</Text><Text style={s.muted}>R$ {item.price.toFixed(2).replace(".", ",")} cada</Text></View><Text style={{ fontWeight: "900", fontSize: 16 }}>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14 }}><PressFeedback onPress={() => cart.updateQuantity(item.productId, item.quantity - 1)}><Text style={{ fontSize: 24, fontWeight: "900" }}>−</Text></PressFeedback><Text style={{ fontWeight: "900" }}>{item.quantity}</Text><PressFeedback onPress={() => cart.updateQuantity(item.productId, item.quantity + 1)}><Text style={{ fontSize: 24, fontWeight: "900" }}>+</Text></PressFeedback><PressFeedback onPress={() => cart.removeItem(item.productId)}><Text style={{ color: PEDIU.coral, fontWeight: "800", marginLeft: "auto" }}>Remover</Text></PressFeedback></View></Card>)}
    <Card><Text style={s.muted}>Subtotal</Text><Text style={{ fontSize: 24, fontWeight: "900", color: PEDIU.ink }}>R$ {cart.subtotal.toFixed(2).replace(".", ",")}</Text><Text style={[s.muted, { marginTop: 6 }]}>Entrega, descontos e total final serão calculados pelo servidor.</Text></Card>
    <PrimaryButton title="Continuar para checkout" onPress={() => router.push("/checkout")} />
  </Page>;
}