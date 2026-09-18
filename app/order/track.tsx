import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

const states = ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue"] as const;

export default function TrackOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = Number(params.orderId);
  const query = trpc.pediu.orders.get.useQuery({ orderId }, { enabled: Number.isInteger(orderId) && orderId > 0, refetchInterval: 5000 });

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
      {states.map((state, i) => <View key={state} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i <= active ? PEDIU.coral : PEDIU.line }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: i <= active ? PEDIU.ink : PEDIU.muted }}>{state}</Text>
          {i === active ? <Text style={s.muted}>Acompanhe a atualização em tempo real.</Text> : null}
        </View>
      </View>)}
      {query.data.status === "Cancelado" ? <Text style={s.muted}>Este pedido foi cancelado.</Text> : null}
    </Card>
  </Page>;
}
