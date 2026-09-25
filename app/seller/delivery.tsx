import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Field, OutlineButton, Page, PrimaryButton, PEDIU, Row, s } from "@/components/pediu-page";

function formatCoordinate(value: number) {
  return value.toFixed(7);
}

export default function SellerDeliveryPage() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const requestedOrderId = Number(params.orderId);
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, { enabled: user?.role === "merchant", refetchInterval: 10_000 });
  const activeOrders = useMemo(() => (orders.data ?? []).filter((order) => order.status === "Pronto" || order.status === "A caminho"), [orders.data]);
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
  const assign = trpc.pediu.experience.delivery.assign.useMutation({ onSuccess: () => void current.refetch() });
  const sendLocation = trpc.pediu.experience.delivery.location.useMutation({ onSuccess: () => { setLocationKey(undefined); void current.refetch(); void orders.refetch(); } });
  const complete = trpc.pediu.experience.delivery.complete.useMutation({ onSuccess: () => { void current.refetch(); void orders.refetch(); } });

  const assignment = current.data?.assignment;
  const latestLocation = current.data?.latestLocation;
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
    assign.mutate({ orderId, courierName: courierName.trim() || undefined, courierPhone: courierPhone.trim() || undefined, etaMinutes: eta.trim() ? Number(eta) : undefined });
  };

  const updateLocation = () => {
    const lat = Number(latitude.replace(",", "."));
    const lon = Number(longitude.replace(",", "."));
    if (!orderId || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const key = locationKey ?? `delivery-location-${orderId}-${Date.now()}`;
    setLocationKey(key);
    sendLocation.mutate({ orderId, latitude: lat, longitude: lon, etaMinutes: eta.trim() ? Number(eta) : undefined, idempotencyKey: key });
  };

  return <Page title="Entregas" eyebrow="OPERAÇÃO DA LOJA">
    <Card>
      <Text style={s.sectionTitle}>Pedidos prontos para entrega</Text>
      {orders.isLoading ? <Text style={s.muted}>Carregando pedidos...</Text> : null}
      {!orders.isLoading && !activeOrders.length ? <Text style={s.muted}>Nenhum pedido pronto ou em rota neste momento.</Text> : null}
      {activeOrders.map((order) => <Row key={order.id} icon="two-wheeler" title={`Pedido #${order.id}`} subtitle={`${order.status} · R$ ${Number(order.total).toFixed(2).replace(".", ",")}`} onPress={() => setSelectedOrderId(order.id)} right={<Text style={{ color: order.id === orderId ? PEDIU.coral : PEDIU.muted, fontWeight: "900" }}>{order.id === orderId ? "Selecionado" : "Abrir"}</Text>} />)}
    </Card>
    {selectedOrder ? <>
      <Card>
        <Text style={s.sectionTitle}>Entregador do pedido #{selectedOrder.id}</Text>
        <Text style={s.muted}>O proprietário da loja é o operador autorizado nesta fase. A atribuição fica registrada para o cliente.</Text>
        <Field label="NOME DO ENTREGADOR" value={courierName} onChangeText={setCourierName} placeholder="Nome exibido ao cliente" />
        <Field label="TELEFONE (OPCIONAL)" value={courierPhone} onChangeText={setCourierPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        <Field label="ETA EM MINUTOS" value={eta} onChangeText={setEta} placeholder="Ex.: 25" keyboardType="numeric" />
        {assign.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{assign.error.message}</Text> : null}
        <PrimaryButton title={assign.isPending ? "Salvando..." : "Atribuir entrega"} onPress={saveAssignment} disabled={assign.isPending} />
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Posição atual</Text>
        <Text style={s.muted}>Use o GPS no dispositivo ou informe coordenadas manualmente no preview web.</Text>
        <Field label="LATITUDE" value={latitude} onChangeText={setLatitude} placeholder="Ex.: -23.550520" keyboardType="decimal-pad" />
        <Field label="LONGITUDE" value={longitude} onChangeText={setLongitude} placeholder="Ex.: -46.633308" keyboardType="decimal-pad" />
        <OutlineButton title="Usar minha localização" onPress={() => void requestGps()} />
        {sendLocation.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{sendLocation.error.message}</Text> : null}
        <PrimaryButton title={sendLocation.isPending ? "Enviando posição..." : "Atualizar posição"} onPress={updateLocation} disabled={sendLocation.isPending || !current.data?.assignment || !latitude || !longitude} />
        {current.data?.latestLocation ? <Text style={s.muted}>Última atualização: {new Date(current.data.latestLocation.createdAt).toLocaleString("pt-BR")}</Text> : <Text style={s.muted}>Nenhuma posição enviada ainda.</Text>}
      </Card>
      {selectedOrder.status === "A caminho" ? <Card><Text style={s.sectionTitle}>Encerramento</Text><Text style={s.muted}>Confirme somente quando a entrega estiver concluída no endereço do cliente.</Text><PrimaryButton title={complete.isPending ? "Encerrando..." : "Marcar como entregue"} onPress={() => complete.mutate({ orderId })} disabled={complete.isPending} />{complete.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{complete.error.message}</Text> : null}</Card> : null}
    </> : null}
  </Page>;
}
