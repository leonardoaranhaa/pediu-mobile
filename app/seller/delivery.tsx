import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Field, s } from "@/components/pediu-page";
import {
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsDock,
  OpsHeader,
  OpsOrderLines,
  OpsSectionTitle,
  OpsShell,
} from "@/components/pediu-ops-ui";

function formatCoordinate(value: number) {
  return value.toFixed(7);
}

function money(value: unknown) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")}`;
}

export default function SellerDeliveryPage() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const requestedOrderId = Number(params.orderId);
  const queueQuery = trpc.pediu.experience.delivery.queue.useQuery(undefined, {
    enabled: user?.role === "merchant",
    refetchInterval: 10_000,
  });
  const activeOrders = useMemo(
    () => queueQuery.data?.queue ?? [],
    [queueQuery.data?.queue],
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number>(
    Number.isInteger(requestedOrderId) && requestedOrderId > 0
      ? requestedOrderId
      : 0,
  );
  const selectedOrder =
    activeOrders.find((order) => order.id === selectedOrderId) ??
    activeOrders[0];
  const orderId = selectedOrder?.id ?? 0;
  const isMarket = selectedOrder?.storeKind === "market";
  const current = trpc.pediu.experience.delivery.current.useQuery(
    { orderId },
    { enabled: orderId > 0, refetchInterval: 8_000 },
  );
  const [courierName, setCourierName] = useState(user?.name ?? "");
  const [courierPhone, setCourierPhone] = useState("");
  const [eta, setEta] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationKey, setLocationKey] = useState<string>();
  const assign = trpc.pediu.experience.delivery.assign.useMutation({
    onSuccess: () => {
      void current.refetch();
      void queueQuery.refetch();
    },
  });
  const sendLocation = trpc.pediu.experience.delivery.location.useMutation({
    onSuccess: () => {
      setLocationKey(undefined);
      void current.refetch();
      void queueQuery.refetch();
    },
  });
  const complete = trpc.pediu.experience.delivery.complete.useMutation({
    onSuccess: () => {
      void current.refetch();
      void queueQuery.refetch();
    },
  });
  const assignment = current.data?.assignment;
  const latestLocation = current.data?.latestLocation;

  useEffect(() => {
    if (!selectedOrder) return;
    if (!eta && selectedOrder.suggestedEtaMinutes != null)
      setEta(String(selectedOrder.suggestedEtaMinutes));
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
    if (permission.status !== "granted") {
      sendLocation.reset();
      return;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
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
    sendLocation.mutate({
      orderId,
      latitude: lat,
      longitude: lon,
      etaMinutes: eta.trim() ? Number(eta) : undefined,
      idempotencyKey: key,
    });
  };

  return (
    <OpsShell
      dock={
        <OpsDock
          items={[
            {
              label: "Cozinha",
              icon: "restaurant",
              to: "/seller",
              active: true,
            },
            {
              label: "Cardápio",
              icon: "restaurant-menu",
              to: "/seller/catalog",
            },
            { label: "Cliente", icon: "home", to: "/" },
          ]}
        />
      }
    >
      <OpsHeader
        eyebrow="LOGÍSTICA"
        title="Entregas"
        subtitle={
          isMarket
            ? "Coleta do mercado e entrega ao endereço do cliente"
            : "Radar, atribuição e rastreio da cozinha"
        }
        status={
          queueQuery.data?.flashCount
            ? `${queueQuery.data.flashCount} Flash`
            : "Fila normal"
        }
        statusTone={queueQuery.data?.flashCount ? "accent" : "neutral"}
        statusIcon="two-wheeler"
      />
      <OpsSectionTitle title="Na fila" count={activeOrders.length} />
      <OpsCard>
        {queueQuery.isLoading ? (
          <Text style={s.muted}>Carregando pedidos...</Text>
        ) : null}
        {!queueQuery.isLoading && !activeOrders.length ? (
          <EmptyState
            icon="two-wheeler"
            title="Fila vazia no momento"
            body="Quando um pedido estiver Pronto ou A caminho, ele aparece aqui com prioridade Flash."
          />
        ) : null}
        {activeOrders.map((order) => (
          <OpsButton
            key={order.id}
            title={`#${order.id}${order.isFlash ? " · FLASH" : ""} · ${order.status} · ${money(order.total)}`}
            variant={order.id === orderId ? "accent" : "ghost"}
            onPress={() => {
              setSelectedOrderId(order.id);
              setEta(
                order.suggestedEtaMinutes != null
                  ? String(order.suggestedEtaMinutes)
                  : "",
              );
            }}
          />
        ))}
      </OpsCard>

      {selectedOrder ? (
        <>
          <OpsCard
            style={
              selectedOrder.isFlash
                ? { borderColor: "#E20D2A", borderWidth: 1.5 }
                : undefined
            }
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text
                style={{
                  color: "#111111",
                  fontFamily: "Fredoka",
                  fontSize: 23,
                  fontWeight: "900",
                }}
              >
                Pedido #{selectedOrder.id}
              </Text>
              {selectedOrder.isFlash ? (
                <OpsBadge tone="primary">FLASH</OpsBadge>
              ) : (
                <OpsBadge tone="muted">PADRÃO</OpsBadge>
              )}
              {isMarket ? (
                <OpsBadge tone="success">MERCADO · COLETA</OpsBadge>
              ) : null}
            </View>
            <OpsOrderLines
              lines={[
                `${selectedOrder.status} · ${money(selectedOrder.total)}`,
                selectedOrder.isFlash
                  ? `ETA sugerido ${selectedOrder.suggestedEtaMinutes ?? queueQuery.data?.flashEtaMaxMinutes ?? 20} min`
                  : "Entrega da fila operacional",
                isMarket
                  ? "Mercado separado · confirme a retirada e siga para o endereço"
                  : "Coleta na loja e atualização de posição pelo Pediu",
              ]}
            />
            <Text style={s.muted}>
              {isMarket
                ? "O mercado separa a sacola; atribua um entregador parceiro para retirar e entregar no endereço do cliente."
                : "O proprietário da loja é o operador autorizado nesta fase. A atribuição fica registrada para o cliente."}
            </Text>
            <Field
              label="NOME DO ENTREGADOR"
              value={courierName}
              onChangeText={setCourierName}
              placeholder="Nome exibido ao cliente"
            />
            <Field
              label="TELEFONE (OPCIONAL)"
              value={courierPhone}
              onChangeText={setCourierPhone}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />
            <Field
              label="ETA EM MINUTOS"
              value={eta}
              onChangeText={setEta}
              placeholder="Ex.: 25"
              keyboardType="numeric"
            />
            {assign.error ? (
              <Text style={{ color: "#E20D2A", fontFamily: "Nunito" }}>
                {assign.error.message}
              </Text>
            ) : null}
            <OpsButton
              title={
                assign.isPending
                  ? "Salvando..."
                  : selectedOrder.isFlash
                    ? "Atribuir Flash"
                    : "Atribuir entrega"
              }
              onPress={saveAssignment}
              disabled={assign.isPending}
            />
          </OpsCard>
          <OpsCard>
            <OpsSectionTitle title="Posição atual" />
            <Text style={s.muted}>
              Use o GPS no dispositivo ou informe coordenadas manualmente no
              preview web.
            </Text>
            <Field
              label="LATITUDE"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="Ex.: -23.550520"
              keyboardType="decimal-pad"
            />
            <Field
              label="LONGITUDE"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="Ex.: -46.633308"
              keyboardType="decimal-pad"
            />
            <OpsButton
              title="Usar minha localização"
              variant="outline"
              onPress={() => void requestGps()}
            />
            {sendLocation.error ? (
              <Text style={{ color: "#E20D2A", fontFamily: "Nunito" }}>
                {sendLocation.error.message}
              </Text>
            ) : null}
            <OpsButton
              title={
                sendLocation.isPending
                  ? "Enviando posição..."
                  : "Atualizar posição"
              }
              onPress={updateLocation}
              disabled={
                sendLocation.isPending ||
                !current.data?.assignment ||
                !latitude ||
                !longitude
              }
            />
            <Text style={s.muted}>
              {current.data?.latestLocation
                ? `Última atualização: ${new Date(current.data.latestLocation.createdAt).toLocaleString("pt-BR")}`
                : "Nenhuma posição enviada ainda."}
            </Text>
          </OpsCard>
          {selectedOrder.status === "A caminho" ? (
            <OpsCard>
              <OpsSectionTitle title="Encerramento" />
              <Text style={s.muted}>
                Confirme somente quando a entrega estiver concluída. Gorjeta, se
                houver, liquida automaticamente.
              </Text>
              <OpsButton
                title={
                  complete.isPending ? "Encerrando..." : "Marcar como entregue"
                }
                onPress={() => complete.mutate({ orderId })}
                disabled={complete.isPending}
              />
              {complete.error ? (
                <Text style={{ color: "#E20D2A", fontFamily: "Nunito" }}>
                  {complete.error.message}
                </Text>
              ) : null}
            </OpsCard>
          ) : null}
        </>
      ) : null}
      <OpsButton
        title="Voltar para a cozinha"
        variant="ghost"
        onPress={() => router.push("/seller")}
      />
    </OpsShell>
  );
}
