import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Agora" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function TrackingMapPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const events = trpc.pediu.experience.tracking.events.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0, refetchInterval: 10000 });
  const current = trpc.pediu.experience.delivery.current.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0, refetchInterval: 8000 });
  const latest = events.data?.find((event) => event.latitude != null && event.longitude != null);
  return <Page title="Acompanhar entrega" eyebrow="RASTREAMENTO">
    <Card>
      <View style={{ height: 240, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2", gap: 8 }}>
        <Text style={s.sectionTitle}>Mapa da entrega</Text>
        {current.data?.assignment ? <Text style={s.muted}>Entregador: {current.data.assignment.courierName}{current.data.assignment.courierPhone ? ` · ${current.data.assignment.courierPhone}` : ""}</Text> : <Text style={s.muted}>Aguardando atribuição do entregador.</Text>}
        {current.data?.assignment?.etaMinutes != null ? <Text style={{ color: PEDIU.coral, fontSize: 14, fontWeight: "900" }}>ETA: {current.data.assignment.etaMinutes} min</Text> : null}
        {current.data?.latestLocation ? <Text style={s.muted}>Última posição: {Number(current.data.latestLocation.latitude).toFixed(5)}, {Number(current.data.latestLocation.longitude).toFixed(5)}</Text> : latest ? <Text style={s.muted}>Última posição registrada no evento: {Number(latest.latitude).toFixed(5)}, {Number(latest.longitude).toFixed(5)}</Text> : <Text style={s.muted}>Aguardando posição do entregador.</Text>}
        <Text style={{ color: PEDIU.green, fontSize: 11, fontWeight: "800" }}>Atualização automática a cada 8 segundos</Text>
      </View>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Linha do tempo</Text>
      {events.isLoading ? <Text style={s.muted}>Buscando eventos da entrega...</Text> : null}
      {events.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Não foi possível carregar o tracking deste pedido.</Text> : null}
      {!events.isLoading && !events.isError && !events.data?.length ? <Text style={s.muted}>A entrega ainda não possui eventos registrados.</Text> : null}
      {events.data?.map((event, index) => <View key={event.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 9 }}><View style={{ alignItems: "center" }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: index === 0 ? PEDIU.coral : PEDIU.line }} />{index < events.data!.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: PEDIU.line }} /> : null}</View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{event.eventType}</Text><Text style={s.muted}>{formatDate(event.createdAt)}</Text></View></View>)}
    </Card>
  </Page>;
}
