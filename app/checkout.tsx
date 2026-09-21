import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { PressFeedback } from "@/components/pediu-interaction";
import { EmptyState, ErrorState } from "@/components/pediu-feedback";
import { useCart } from "@/lib/cart-store";
import { trpc } from "@/lib/trpc";

const METHODS = [{ id: "pix", label: "PIX" }, { id: "card", label: "Cartão" }, { id: "cash", label: "Pagamento na entrega" }] as const;
const money = (value: number) => value.toFixed(2).replace(".", ",");

export default function CheckoutScreen() {
  const cart = useCart();
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("pix");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const productsQuery = trpc.pediu.marketplace.products.useQuery(undefined, { staleTime: 15_000, enabled: Boolean(cart.storeId) });
  const createPix = trpc.pediu.payments.createPix.useMutation();
  const createOrder = trpc.pediu.orders.create.useMutation({
    onSuccess: async (result) => {
      try {
        if (method === "pix") {
          const charge = await createPix.mutateAsync({ orderId: result.orderId });
          cart.clear();
          router.replace({ pathname: "/order/track", params: { orderId: String(result.orderId), paymentId: String(charge.paymentId), pixUrl: charge.checkoutUrl ?? "" } });
          return;
        }
        cart.clear();
        router.replace({ pathname: "/order/track", params: { orderId: String(result.orderId) } });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível preparar o pagamento.");
        setSubmitting(false);
      }
    },
    onError: (err) => { setError(err.message); setSubmitting(false); },
  });
  const serverDeliveryFee = useMemo(() => {
    const product = (productsQuery.data ?? []).find((item) => item.storeId === cart.storeId);
    return Number(product?.deliveryFee ?? 0);
  }, [productsQuery.data, cart.storeId]);
  const estimatedTotal = cart.subtotal + serverDeliveryFee;

  if (!cart.items.length) return <Page title="Finalizar pedido" eyebrow="CHECKOUT" back><EmptyState title="Carrinho vazio" description="Adicione produtos antes de finalizar o pedido." /><PrimaryButton title="Voltar para produtos" onPress={() => router.push("/search")} /></Page>;

  const confirm = () => {
    if (!address.trim() || !cart.storeId || submitting || createOrder.isPending) return;
    setError("");
    setSubmitting(true);
    createOrder.mutate({
      storeId: cart.storeId,
      total: estimatedTotal.toFixed(2),
      paymentMethod: method,
      deliveryAddress: address.trim(),
      items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.price.toFixed(2) })),
    });
  };

  return <Page title="Finalizar pedido" eyebrow="CHECKOUT" back>
    <Card><Text style={s.sectionTitle}>Itens</Text>{cart.items.map((item) => <View key={item.productId} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}><Text style={{ flex: 1 }}>{item.quantity}× {item.name}</Text><Text style={{ fontWeight: "800" }}>R$ {money(item.price * item.quantity)}</Text></View>)}</Card>
    <Card><Text style={s.sectionTitle}>Endereço de entrega</Text><TextInput value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" accessibilityLabel="Endereço de entrega" /></Card>
    <Card><Text style={s.sectionTitle}>Forma de entrega</Text><Text style={s.muted}>Entrega padrão · R$ {money(serverDeliveryFee)}</Text></Card>
    <Card><Text style={s.sectionTitle}>Pagamento</Text><View style={{ gap: 8 }}>{METHODS.map((item) => <PressFeedback key={item.id} onPress={() => setMethod(item.id)}><View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: method === item.id ? PEDIU.coral : PEDIU.line, backgroundColor: method === item.id ? PEDIU.coralSoft : PEDIU.white }}><Text style={{ fontWeight: "800", color: PEDIU.text }}>{item.label}</Text></View></PressFeedback>)}</View></Card>
    <Card><Text style={s.sectionTitle}>Resumo</Text><Text style={s.muted}>Subtotal: R$ {money(cart.subtotal)}</Text><Text style={s.muted}>Entrega: R$ {money(serverDeliveryFee)}</Text><Text style={{ color: PEDIU.ink, fontSize: 21, fontWeight: "900", marginTop: 8 }}>Total: R$ {money(estimatedTotal)}</Text><Text style={[s.muted, { marginTop: 5 }]}>O servidor valida novamente preços, disponibilidade, loja e total antes de criar o pedido.</Text></Card>
    {error ? <ErrorState title="Não foi possível finalizar" description={error} onRetry={confirm} /> : null}
    <PrimaryButton title={submitting || createOrder.isPending || createPix.isPending ? "Processando..." : "Confirmar pedido"} onPress={confirm} disabled={!address.trim() || !cart.storeId || submitting || createOrder.isPending || createPix.isPending} />
  </Page>;
}