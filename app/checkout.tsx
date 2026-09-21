import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Field, Page, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";

type PaymentMethod = "pix" | "card" | "cash";

function money(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function checkoutKey() {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutScreen() {
  const { isAuthenticated } = useAuth();
  const { items, subtotal, deliveryFee, total, hydrated, clear } = useCart();
  const addresses = trpc.pediu.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const createOrder = trpc.pediu.orders.create.useMutation({
    onSuccess: (result) => {
      clear();
      router.replace({ pathname: "/order/track", params: { orderId: String(result.orderId), paymentId: result.paymentId ? String(result.paymentId) : "" } });
    },
  });
  const [address, setAddress] = useState("");
  const [addressId, setAddressId] = useState<number | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    if (!idempotencyKey) setIdempotencyKey(checkoutKey());
  }, [idempotencyKey]);

  useEffect(() => {
    const preferred = addresses.data?.find((item) => item.isDefault === 1) ?? addresses.data?.[0];
    if (!address && preferred) {
      setAddressId(preferred.id);
      setAddress([`${preferred.street}, ${preferred.number}`, preferred.complement, `${preferred.neighborhood} · ${preferred.city}/${preferred.state}`, preferred.postalCode].filter(Boolean).join(", "));
    }
  }, [address, addresses.data]);

  const submit = () => {
    if (!items.length || !address.trim() || !idempotencyKey) return;
    createOrder.mutate({
      idempotencyKey,
      storeId: items[0].storeId,
      total: total.toFixed(2),
      paymentMethod,
      addressId,
      deliveryAddress: address.trim(),
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity, unitPrice: Number(item.price).toFixed(2) })),
    });
  };

  if (!hydrated) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Restaurando pedido...</Text></Card></Page>;
  if (!isAuthenticated) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Entre para continuar</Text><Text style={s.muted}>Sua sessão é necessária para criar um pedido e acompanhar o pagamento.</Text></Card></Page>;
  if (!items.length) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Seu carrinho está vazio</Text><PrimaryButton title="Voltar ao carrinho" onPress={() => router.replace("/cart")} /></Card></Page>;

  return <Page title="Finalizar pedido" eyebrow="CHECKOUT" back>
    <Card>
      <Text style={s.sectionTitle}>Endereço de entrega</Text>
      {addresses.data?.length ? <View style={{ gap: 8 }}>{addresses.data.map((saved) => {
        const label = [`${saved.street}, ${saved.number}`, saved.complement, `${saved.neighborhood} · ${saved.city}/${saved.state}`, saved.postalCode].filter(Boolean).join(", ");
        return <Pressable key={saved.id} onPress={() => { setAddressId(saved.id); setAddress(label); }} style={{ borderWidth: 1, borderColor: addressId === saved.id ? PEDIU.coral : PEDIU.line, backgroundColor: addressId === saved.id ? PEDIU.coralSoft : PEDIU.white, borderRadius: 14, padding: 12, gap: 3 }}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{saved.label}{saved.isDefault ? " · Padrão" : ""}</Text><Text style={s.muted}>{label}</Text></Pressable>;
      })}</View> : null}
      <Field label="ENDEREÇO" value={address} onChangeText={(value) => { setAddressId(undefined); setAddress(value); }} placeholder="Rua, número, bairro e cidade" multiline />
      {addresses.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{addresses.error.message}</Text> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Pagamento</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>{(["pix", "card", "cash"] as const).map((method) => <Pressable key={method} onPress={() => setPaymentMethod(method)} style={{ flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: paymentMethod === method ? PEDIU.coral : PEDIU.line, backgroundColor: paymentMethod === method ? PEDIU.coralSoft : PEDIU.white, borderRadius: 14 }}><Text style={{ color: paymentMethod === method ? PEDIU.coral : PEDIU.muted, fontWeight: "900" }}>{method === "pix" ? "PIX" : method === "card" ? "Cartão" : "Dinheiro"}</Text></Pressable>)}</View>
      {paymentMethod === "card" ? <Text style={s.muted}>O cartão será processado pelo provedor. O Pediu não armazena dados completos.</Text> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Resumo do pedido</Text>
      {items.map((item) => <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text style={s.muted}>{item.quantity} × {item.name}</Text><Text style={{ color: PEDIU.ink, fontWeight: "800" }}>{money(Number(item.price) * item.quantity)}</Text></View>)}
      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: PEDIU.line, paddingTop: 12 }}><View style={row}><Text style={s.muted}>Subtotal</Text><Text style={value}>{money(subtotal)}</Text></View><View style={row}><Text style={s.muted}>Entrega</Text><Text style={value}>{money(deliveryFee)}</Text></View><View style={row}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>Total</Text><Text style={{ color: PEDIU.coral, fontSize: 21, fontWeight: "900" }}>{money(total)}</Text></View></View>
      {createOrder.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{createOrder.error.message}</Text> : null}
      <PrimaryButton title={createOrder.isPending ? "Criando pedido..." : "Confirmar pedido"} onPress={submit} disabled={createOrder.isPending || !address.trim()} />
    </Card>
  </Page>;
}

const row = { flexDirection: "row" as const, justifyContent: "space-between" as const };
const value = { color: PEDIU.ink, fontWeight: "800" as const };
