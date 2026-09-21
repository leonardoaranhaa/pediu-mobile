import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

const states = ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue"] as const;
const money = (value: number) => value.toFixed(2).replace(".", ",");

export default function TrackOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string; paymentId?: string; pixUrl?: string }>();
  const orderId = Number(params.orderId);
  const paymentId = Number(params.paymentId);
  const pixUrl = typeof params.pixUrl === "string" ? params.pixUrl : "";
  const query = trpc.pediu.orders.get.useQuery({ orderId }, { enabled: Number.isInteger(orderId) && orderId > 0, refetchInterval: 5000 });
  const paymentQuery = trpc.pediu.payments.get.useQuery({ paymentId }, { enabled: Number.isInteger(paymentId) && paymentId > 0, refetchInterval: 5000 });

  if (!Number.isInteger(orderId) || orderId <= 0) return <Page title="Acompanhar pedido" eyebrow="PEDIDO"><Card><Text style={s.sectionTitle}>Pedido inválido</Text><Text style={s.muted}>Abra o acompanhamento a partir de um pedido válido.</Text></Card></Page>;
  if (query.isLoading) return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={s.sectionTitle}>Carregando pedido...</Text><Text style={s.muted}>Buscando o status mais recente.</Text></Card></Page>;
  if (query.isError || !query.data) return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={s.sectionTitle}>Não foi possível carregar</Text><Text style={s.muted}>Este pedido não existe ou não está disponível para sua conta.</Text><PrimaryButton title="Tentar novamente" onPress={() => query.refetch()} /></Card></Page>;

  const status = String(query.data.status);
  const active = status === "Cancelado" ? -1 : states.indexOf(status as typeof states[number]);
  const knownStatus = active >= 0;
  const paymentStatus = paymentQuery.data?.status;
  const paymentLabel = paymentStatus === "paid" ? "confirmado" : paymentStatus === "failed" ? "falhou" : "aguardando confirmação";

  return <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${query.data.id}`}>
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: status === "Cancelado" ? PEDIU.canvas : PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={status === "Entregue" ? "check-circle" : status === "Cancelado" ? "cancel" : "delivery-dining"} size={23} color={status === "Cancelado" ? PEDIU.muted : PEDIU.coral} />
        </View>
        <View style={{ flex: 1 }}><Text style={s.sectionTitle}>Pedido #{query.data.id}</Text><Text style={s.muted}>Status atual: {status}</Text></View>
      </View>
      <Text style={[s.muted, { marginTop: 8 }]}>Total: R$ {money(Number(query.data.total))}</Text>
      {query.data.deliveryAddress ? <Text style={s.muted}>Entrega: {query.data.deliveryAddress}</Text> : null}
      {paymentQuery.data ? <View style={{ backgroundColor: paymentStatus === "paid" ? PEDIU.mint : PEDIU.peach, borderRadius: 15, padding: 13, gap: 5, marginTop: 10 }}><Text style={s.sectionTitle}>Pagamento: {paymentLabel}</Text><Text style={s.muted}>Método: {paymentQuery.data.method === "pix" ? "PIX" : paymentQuery.data.method === "card" ? "Cartão" : "Dinheiro"}</Text>{paymentQuery.data.method === "pix" && paymentStatus === "pending" && pixUrl ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir pagamento PIX" onPress={() => void Linking.openURL(pixUrl)} style={{ marginTop: 5, backgroundColor: PEDIU.coral, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }}><Text style={{ color: PEDIU.white, fontWeight: "900", fontSize: 12 }}>Abrir pagamento PIX</Text></Pressable> : null}</View> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Andamento</Text>
      {!knownStatus && status !== "Cancelado" ? <Text style={[s.muted, { marginTop: 8 }]}>Status recebido: {status}. Aguardando atualização do fluxo.</Text> : null}
      {states.map((state, i) => <View key={state} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i <= active ? PEDIU.coral : PEDIU.line }} /><View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: "900", color: i <= active ? PEDIU.ink : PEDIU.muted }}>{state}</Text>{i === active ? <Text style={s.muted}>Atualizado automaticamente a cada 5 segundos.</Text> : null}</View></View>)}
      {status === "Cancelado" ? <Text style={s.muted}>Este pedido foi cancelado.</Text> : null}
    </Card>
    <PrimaryButton title="Atualizar agora" onPress={() => { void query.refetch(); if (paymentId > 0) void paymentQuery.refetch(); }} disabled={query.isFetching || paymentQuery.isFetching} />
  </Page>;
}