import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Field, Page, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";

type PaymentMethod = "pix" | "card" | "cash";

function money(value: number | string) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function checkoutKey() {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutScreen() {
  const { isAuthenticated } = useAuth();
  const { items, total: estimatedTotal, hydrated, clear } = useCart();
  const addresses = trpc.pediu.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const normalizedCouponInput = couponCode.trim().toUpperCase();
  const quoteInput = useMemo(() => ({
    storeId: items[0]?.storeId ?? 1,
    items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    couponCode: appliedCouponCode || undefined,
  }), [appliedCouponCode, items]);
  const quote = trpc.pediu.checkout.quote.useQuery(quoteInput, {
    enabled: isAuthenticated && hydrated && items.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createOrder = trpc.pediu.orders.create.useMutation({
    onSuccess: (result) => {
      clear();
      router.replace({ pathname: "/order/success", params: { orderId: String(result.orderId), paymentId: result.paymentId ? String(result.paymentId) : "", total: quote.data?.total ?? "" } });
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

  const applyCoupon = () => {
    if (appliedCouponCode && normalizedCouponInput === appliedCouponCode) {
      setAppliedCouponCode("");
      setCouponCode("");
      return;
    }
    if (normalizedCouponInput) setAppliedCouponCode(normalizedCouponInput);
  };

  const submit = () => {
    if (!items.length || !address.trim() || !idempotencyKey || !quote.data || quote.isFetching) return;
    createOrder.mutate({
      idempotencyKey,
      storeId: quote.data.storeId,
      total: quote.data.total,
      paymentMethod,
      addressId,
      couponCode: quote.data.couponCode,
      deliveryAddress: address.trim(),
      items: quote.data.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
    });
  };

  if (!hydrated) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Restaurando pedido...</Text></Card></Page>;
  if (!isAuthenticated) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Entre para continuar</Text><Text style={s.muted}>Sua sessão é necessária para criar um pedido e acompanhar o pagamento.</Text></Card></Page>;
  if (!items.length) return <Page title="Checkout" eyebrow="PEDIDO" back><Card><Text style={s.sectionTitle}>Seu carrinho está vazio</Text><PrimaryButton title="Voltar ao carrinho" onPress={() => router.replace("/cart")} /></Card></Page>;

  const quotedTotal = quote.data ? Number(quote.data.total) : estimatedTotal;
  const couponCanBeRemoved = Boolean(appliedCouponCode && normalizedCouponInput === appliedCouponCode);

  return <Page title="Finalizar pedido" eyebrow="CHECKOUT" back>
    <Card>
      <Text style={s.sectionTitle}>Conferência do pedido</Text>
      {quote.isLoading ? <Text style={s.muted}>Conferindo preços, disponibilidade e cupom...</Text> : null}
      {quote.isError ? <><Text style={{ color: PEDIU.coral, fontSize: 12 }}>{quote.error.message}</Text><PrimaryButton title="Atualizar cotação" onPress={() => void quote.refetch()} /></> : null}
      {quote.data ? <><Text style={s.muted}>Valores confirmados pelo servidor.</Text><View style={{ gap: 6, marginTop: 10 }}>{quote.data.items.map((item) => <View key={item.productId} style={row}><Text style={s.muted}>{item.quantity} × {item.name}</Text><Text style={value}>{money(item.lineTotal)}</Text></View>)}</View><View style={{ gap: 8, borderTopWidth: 1, borderTopColor: PEDIU.line, paddingTop: 12, marginTop: 12 }}><View style={row}><Text style={s.muted}>Subtotal</Text><Text style={value}>{money(quote.data.subtotal)}</Text></View><View style={row}><Text style={s.muted}>Entrega</Text><Text style={value}>{money(quote.data.deliveryFee)}</Text></View>{Number(quote.data.discount) > 0 ? <View style={row}><Text style={s.muted}>Desconto {quote.data.couponCode ? `(${quote.data.couponCode})` : ""}</Text><Text style={{ color: PEDIU.green, fontWeight: "900" }}>− {money(quote.data.discount)}</Text></View> : null}<View style={row}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>Total confirmado</Text><Text style={{ color: PEDIU.coral, fontSize: 21, fontWeight: "900" }}>{money(quote.data.total)}</Text></View></View></> : <Text style={s.muted}>Total estimado localmente: {money(estimatedTotal)}. A confirmação depende da cotação do servidor.</Text>}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Cupom de desconto</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}><View style={{ flex: 1 }}><Field label="CÓDIGO" value={couponCode} onChangeText={setCouponCode} placeholder="Ex.: BEMVINDO10" autoCapitalize="characters" /></View><PrimaryButton title={couponCanBeRemoved ? "Remover" : "Aplicar"} onPress={applyCoupon} disabled={!normalizedCouponInput && !appliedCouponCode} /></View>
      {appliedCouponCode && !quote.isError && quote.data ? <Text style={{ color: PEDIU.green, fontSize: 12, fontWeight: "800" }}>Cupom {appliedCouponCode} validado. Desconto: {money(quote.data.discount)}.</Text> : null}
      {appliedCouponCode && quote.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>O cupom não foi aplicado. Remova-o ou informe outro código.</Text> : null}
    </Card>
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
      <Text style={s.sectionTitle}>Confirmação</Text>
      <Text style={s.muted}>O total exibido será enviado ao servidor: {money(quotedTotal)}.</Text>
      {createOrder.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{createOrder.error.message}</Text> : null}
      <PrimaryButton title={createOrder.isPending ? "Criando pedido..." : "Confirmar pedido"} onPress={submit} disabled={createOrder.isPending || quote.isFetching || !quote.data || !address.trim()} />
    </Card>
  </Page>;
}

const row = { flexDirection: "row" as const, justifyContent: "space-between" as const };
const value = { color: PEDIU.ink, fontWeight: "800" as const };
