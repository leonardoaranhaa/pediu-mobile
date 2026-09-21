import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Page, Card, s } from "@/components/pediu-page";

export default function TrackingMapPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const events = trpc.pediu.experience.tracking.events.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0, refetchInterval: 10000 });
  const latest = events.data?.find((event) => event.latitude != null && event.longitude != null);
  return <Page title="Acompanhar entrega" eyebrow="RASTREAMENTO">
    <Card>
      <View style={{ height: 280, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2" }}>
        <Text style={s.sectionTitle}>Mapa da entrega</Text>
        {latest ? <Text style={s.muted}>{Number(latest.latitude).toFixed(5)}, {Number(latest.longitude).toFixed(5)}</Text> : <Text style={s.muted}>Aguardando posição do entregador.</Text>}
      </View>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Última atualização</Text>
      <Text style={s.muted}>{events.data?.[0]?.eventType ?? "Aguardando atualização"}</Text>
    </Card>
  </Page>;
}
