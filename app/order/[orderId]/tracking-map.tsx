import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Page, Card, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { trackingEventLabel, trackingFreshnessLabel } from "@/lib/order-copy";

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
  const freshness = current.data?.locationFreshness ?? "unavailable";
  const freshnessLabel = trackingFreshnessLabel(freshness);
  const ageSeconds = current.data?.locationAgeSeconds;
  const ageLabel = ageSeconds == null
    ? "tempo não informado"
    : ageSeconds < 60
      ? `há ${ageSeconds}s`
      : `há ${Math.max(1, Math.round(ageSeconds / 60))} min`;
  const hasNetworkError = current.isError || events.isError;
  return <Page title="Acompanhar entrega" eyebrow="RASTREAMENTO">
    <Card>
      <View style={{ height: 240, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2", gap: 8, paddingHorizontal: 20 }}>
        <Text style={s.sectionTitle}>Acompanhamento da entrega</Text>
        {current.data?.assignment ? <Text style={s.muted}>Entregador: {current.data.assignment.courierName}{current.data.assignment.courierPhone ? ` · ${current.data.assignment.courierPhone}` : ""}</Text> : <Text style={s.muted}>Estamos procurando um entregador parceiro.</Text>}
        {current.data?.assignment?.etaMinutes != null ? <Text style={{ color: PEDIU.coral, fontSize: 14, fontWeight: "900" }}>Previsão: até {current.data.assignment.etaMinutes} min</Text> : null}
        {current.data?.latestLocation || latest ? <Text style={s.muted}>A última localização foi recebida e será atualizada durante o trajeto.</Text> : <Text style={s.muted}>A localização aparecerá assim que o entregador iniciar o trajeto.</Text>}
        <Text style={{ color: freshness === "fresh" ? PEDIU.green : freshness === "stale" ? PEDIU.orange : PEDIU.muted, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{freshnessLabel} · {ageLabel}</Text>
        {hasNetworkError ? <Text style={{ color: PEDIU.coral, fontSize: 11, fontWeight: "800", textAlign: "center" }}>Não foi possível atualizar agora. A última informação continua visível.</Text> : <Text style={{ color: PEDIU.green, fontSize: 11, fontWeight: "800" }}>Atualização automática durante a entrega</Text>}
        {hasNetworkError ? <OutlineButton title="Tentar novamente" onPress={() => { void current.refetch(); void events.refetch(); }} disabled={current.isFetching || events.isFetching} /> : null}
      </View>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Atualizações da entrega</Text>
      {events.isLoading ? <Text style={s.muted}>Buscando atualizações...</Text> : null}
      {events.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Não foi possível carregar as atualizações deste pedido.</Text> : null}
      {!events.isLoading && !events.isError && !events.data?.length ? <Text style={s.muted}>Ainda não há atualizações da entrega.</Text> : null}
      {events.data?.map((event, index) => <View key={event.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 9 }}><View style={{ alignItems: "center" }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: index === 0 ? PEDIU.coral : PEDIU.line }} />{index < events.data!.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: PEDIU.line }} /> : null}</View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{trackingEventLabel(event.eventType)}</Text><Text style={s.muted}>{formatDate(event.createdAt)}</Text></View></View>)}
    </Card>
  </Page>;
}
