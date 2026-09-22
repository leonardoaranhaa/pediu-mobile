import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { Page, Card, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

const states = ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue"] as const;

export default function TrackOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string; paymentId?: string; pixUrl?: string }>();
  const orderId = Number(params.orderId);
  const paymentId = Number(params.paymentId);
  const pixUrl = typeof params.pixUrl === "string" ? params.pixUrl : "";
  const query = trpc.pediu.orders.get.useQuery({ orderId }, { enabled: Number.isInteger(orderId) && orderId > 0, refetchInterval: 5000 });
  const paymentQuery = trpc.pediu.payments.get.useQuery(
    { paymentId },
    { enabled: Number.isInteger(paymentId) && paymentId > 0, refetchInterval: 5000 },
  );

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return <Page title="Acompanhar pedido" eyebrow="PEDIDO"><Card><Text style={s.sectionTitle}>Pedido inválido</Text><Text style={s.muted}>Abra o acompanhamento a partir de um pedido válido.</Text></Card></Page>;
  }

  if (query.isLoading) {
    return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={s.sectionTitle}>Carregando pedido...</Text><Text style={s.muted}>Buscando o status mais recente.</Text></Card></Page>;
  }

  if (query.isError || !query.data) {
    return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={s.sectionTitle}>Não foi possível carregar</Text><Text style={s.muted}>Este pedido não existe ou não está disponível para sua conta.</Text></Card></Page>;
  }

  const active = query.data.status === "Cancelado" ? -1 : states.indexOf(query.data.status as typeof states[number]);
  return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${query.data.id}`}>
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={query.data.status === "Entregue" ? "check-circle" : query.data.status === "Cancelado" ? "cancel" : "delivery-dining"} size={22} color={query.data.status === "Cancelado" ? PEDIU.muted : PEDIU.coral} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Pedido #{query.data.id}</Text>
          <Text style={s.muted}>Status atual: {query.data.status}</Text>
        </View>
      </View>
      <Text style={[s.muted, { marginTop: 2 }]}>Total: R$ {Number(query.data.total).toFixed(2).replace(".", ",")}</Text>
      {query.data.deliveryAddress ? <Text style={s.muted}>Entrega: {query.data.deliveryAddress}</Text> : null}
      {paymentQuery.data ? (
        <View style={{ backgroundColor: paymentQuery.data.status === "paid" ? "#EAF9F1" : PEDIU.peach, borderRadius: 15, padding: 13, gap: 5 }}>
          <Text style={s.sectionTitle}>Pagamento: {paymentQuery.data.status === "paid" ? "confirmado" : paymentQuery.data.status === "failed" ? "falhou" : "aguardando confirmação"}</Text>
          <Text style={s.muted}>Método: {paymentQuery.data.method === "pix" ? "PIX" : paymentQuery.data.method === "card" ? "Cartão" : "Dinheiro"}</Text>
          {paymentQuery.data.method === "pix" && paymentQuery.data.status === "pending" && pixUrl ? (
            <Pressable onPress={() => void Linking.openURL(pixUrl)} style={{ marginTop: 5, backgroundColor: PEDIU.coral, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: PEDIU.white, fontWeight: "900", fontSize: 12 }}>Abrir pagamento PIX</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {states.map((state, i) => <View key={state} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i <= active ? PEDIU.coral : PEDIU.line }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: i <= active ? PEDIU.ink : PEDIU.muted }}>{state}</Text>
          {i === active ? <Text style={s.muted}>Acompanhe a atualização em tempo real.</Text> : null}
        </View>
      </View>)}
      {query.data.status === "Cancelado" ? <Text style={s.muted}>Este pedido foi cancelado.</Text> : null}
      {query.data.status !== "Cancelado" ? <OutlineButton title="Ver entregador e posição" onPress={() => router.push({ pathname: "/order/[orderId]/tracking-map", params: { orderId: String(query.data.id) } })} /> : null}
    </Card>
  </Page>;
}
