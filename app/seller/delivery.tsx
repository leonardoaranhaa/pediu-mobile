import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Field, OutlineButton, Page, PrimaryButton, PEDIU, Row, s } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

function formatCoordinate(value: number) {
  return value.toFixed(7);
}

export default function SellerDeliveryPage() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const requestedOrderId = Number(params.orderId);
  const queueQuery = trpc.pediu.experience.delivery.queue.useQuery(undefined, {
    enabled: user?.role === "merchant",
    refetchInterval: 10_000,
  });
  const activeOrders = useMemo(() => queueQuery.data?.queue ?? [], [queueQuery.data?.queue]);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(Number.isInteger(requestedOrderId) && requestedOrderId > 0 ? requestedOrderId : 0);
  const selectedOrder = activeOrders.find((order) => order.id === selectedOrderId) ?? activeOrders[0];
  const orderId = selectedOrder?.id ?? 0;
  const current = trpc.pediu.experience.delivery.current.useQuery({ orderId }, { enabled: orderId > 0, refetchInterval: 8_000 });
  const [courierName, setCourierName] = useState(user?.name ?? "");
  const [courierPhone, setCourierPhone] = useState("");
  const [eta, setEta] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationKey, setLocationKey] = useState<string>();
  const assign = trpc.pediu.experience.delivery.assign.useMutation({ onSuccess: () => { void current.refetch(); void queueQuery.refetch(); } });
  const sendLocation = trpc.pediu.experience.delivery.location.useMutation({ onSuccess: () => { setLocationKey(undefined); void current.refetch(); void queueQuery.refetch(); } });
  const complete = trpc.pediu.experience.delivery.complete.useMutation({ onSuccess: () => { void current.refetch(); void queueQuery.refetch(); } });

  const assignment = current.data?.assignment;
  const latestLocation = current.data?.latestLocation;
  useEffect(() => {
    if (!selectedOrder) return;
    if (!eta && selectedOrder.suggestedEtaMinutes != null) {
      setEta(String(selectedOrder.suggestedEtaMinutes));
    }
  }, [eta, selectedOrder]);

  useEffect(() => {
    if (!assignment) return;
    setCourierName(assignment.courierName);
    setCourierPhone(assignment.courierPhone ?? "");
    setEta(assignment.etaMinutes == null ? "" : String(assignment.etaMinutes));
    if (latestLocation) {
      setLatitude(String(latestLocation.latitude));
      setLongitude(String(latestLocation.longitude));
    }
  }, [assignment, latestLocation]);

  const requestGps = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") { sendLocation.reset(); return; }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLatitude(formatCoordinate(position.coords.latitude));
    setLongitude(formatCoordinate(position.coords.longitude));
  };

  const saveAssignment = () => {
    if (!orderId) return;
    assign.mutate({
      orderId,
      courierName: courierName.trim() || undefined,
      courierPhone: courierPhone.trim() || undefined,
      etaMinutes: eta.trim() ? Number(eta) : undefined,
    });
  };

  const updateLocation = () => {
    const lat = Number(latitude.replace(",", "."));
    const lon = Number(longitude.replace(",", "."));
    if (!orderId || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const key = locationKey ?? `delivery-location-${orderId}-${Date.now()}`;
    setLocationKey(key);
    sendLocation.mutate({ orderId, latitude: lat, longitude: lon, etaMinutes: eta.trim() ? Number(eta) : undefined, idempotencyKey: key });
  };

  return (
    <Page title="Entregas" eyebrow="OPERAÇÃO DA LOJA">
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>FILA PRIORIZADA</Text>
        <Text style={styles.heroTitle}>Entregas da loja</Text>
        <Text style={styles.heroBody}>
          Pedidos Flash sobem primeiro. {queueQuery.data?.flashCount ? `${queueQuery.data.flashCount} Flash na fila.` : "Nenhum Flash aguardando."}
        </Text>
      </View>

      <Card>
        <Text style={s.sectionTitle}>Fila de entrega</Text>
        {queueQuery.isLoading ? <Text style={s.muted}>Carregando pedidos...</Text> : null}
        {!queueQuery.isLoading && !activeOrders.length ? (
          <EmptyState
            icon="two-wheeler"
            title="Fila vazia no momento"
            body="Quando um pedido estiver Pronto ou A caminho, ele aparece aqui com prioridade Flash."
          />
        ) : null}
        {activeOrders.map((order, index) => (
          <Row
            key={order.id}
            icon={order.isFlash ? "bolt" : "two-wheeler"}
            title={`#${order.id}${order.isFlash ? " · FLASH" : ""}`}
            subtitle={`${order.status} · R$ ${Number(order.total).toFixed(2).replace(".", ",")}${order.isFlash ? " · prioridade" : ""} · posição ${index + 1}`}
            onPress={() => { setSelectedOrderId(order.id); setEta(order.suggestedEtaMinutes != null ? String(order.suggestedEtaMinutes) : ""); }}
            right={<Text style={{ color: order.id === orderId ? PEDIU.coral : PEDIU.muted, fontWeight: "900" }}>{order.id === orderId ? "Selecionado" : "Abrir"}</Text>}
          />
        ))}
      </Card>

      {selectedOrder ? (
        <>
          <Card style={selectedOrder.isFlash ? styles.flashCard : undefined}>
            <Text style={s.sectionTitle}>Entregador do pedido #{selectedOrder.id}</Text>
            {selectedOrder.isFlash ? (
              <View style={styles.flashNote}>
                <Text style={styles.flashNoteText}>
                  Pediu Flash · ETA sugerido {selectedOrder.suggestedEtaMinutes ?? queueQuery.data?.flashEtaMaxMinutes ?? 20} min
                </Text>
              </View>
            ) : null}
            <Text style={s.muted}>O proprietário da loja é o operador autorizado nesta fase. A atribuição fica registrada para o cliente.</Text>
            <Field label="NOME DO ENTREGADOR" value={courierName} onChangeText={setCourierName} placeholder="Nome exibido ao cliente" />
            <Field label="TELEFONE (OPCIONAL)" value={courierPhone} onChangeText={setCourierPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <Field label="ETA EM MINUTOS" value={eta} onChangeText={setEta} placeholder="Ex.: 25" keyboardType="numeric" />
            {assign.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{assign.error.message}</Text> : null}
            <PrimaryButton title={assign.isPending ? "Salvando..." : selectedOrder.isFlash ? "Atribuir Flash" : "Atribuir entrega"} onPress={saveAssignment} disabled={assign.isPending} />
          </Card>
          <Card>
            <Text style={s.sectionTitle}>Posição atual</Text>
            <Text style={s.muted}>Use o GPS no dispositivo ou informe coordenadas manualmente no preview web.</Text>
            <Field label="LATITUDE" value={latitude} onChangeText={setLatitude} placeholder="Ex.: -23.550520" keyboardType="decimal-pad" />
            <Field label="LONGITUDE" value={longitude} onChangeText={setLongitude} placeholder="Ex.: -46.633308" keyboardType="decimal-pad" />
            <OutlineButton title="Usar minha localização" onPress={() => void requestGps()} />
            {sendLocation.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{sendLocation.error.message}</Text> : null}
            <PrimaryButton title={sendLocation.isPending ? "Enviando posição..." : "Atualizar posição"} onPress={updateLocation} disabled={sendLocation.isPending || !current.data?.assignment || !latitude || !longitude} />
            {current.data?.latestLocation ? (
              <Text style={s.muted}>Última atualização: {new Date(current.data.latestLocation.createdAt).toLocaleString("pt-BR")}</Text>
            ) : (
              <Text style={s.muted}>Nenhuma posição enviada ainda.</Text>
            )}
          </Card>
          {selectedOrder.status === "A caminho" ? (
            <Card>
              <Text style={s.sectionTitle}>Encerramento</Text>
              <Text style={s.muted}>Confirme somente quando a entrega estiver concluída. Gorjeta, se houver, liquida automaticamente.</Text>
              <PrimaryButton title={complete.isPending ? "Encerrando..." : "Marcar como entregue"} onPress={() => complete.mutate({ orderId })} disabled={complete.isPending} />
              {complete.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{complete.error.message}</Text> : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  heroEyebrow: {
    color: PEDIU_TOKENS.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: PEDIU_TOKENS.white,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroBody: {
    color: "rgba(255,244,232,0.72)",
    fontSize: 12,
    lineHeight: 18,
  },
  flashCard: {
    borderColor: PEDIU_TOKENS.primary,
    borderWidth: 1.5,
  },
  flashNote: {
    borderRadius: 12,
    backgroundColor: PEDIU_TOKENS.primarySoft,
    padding: 10,
  },
  flashNoteText: {
    color: PEDIU_TOKENS.ink,
    fontWeight: "800",
    fontSize: 12,
  },
});
