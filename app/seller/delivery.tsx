import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  OutlineButton,
  Page,
  PrimaryButton,
  PEDIU,
  Row,
  s,
} from "@/components/pediu-page";

function offerKey(orderId: number, courierUserId: number) {
  const hour = new Date().toISOString().slice(0, 13);
  return `offer-${orderId}-${courierUserId}-${hour}`;
}

export default function SellerDeliveryPage() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const requestedOrderId = Number(params.orderId);
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 10_000,
  });
  const couriers = trpc.pediu.stores.couriers.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 15_000,
  });
  const readyOrders = useMemo(
    () =>
      (orders.data ?? []).filter(
        (order) =>
          order.fulfillmentMode !== "pickup" &&
          (order.status === "Pronto" || order.status === "A caminho"),
      ),
    [orders.data],
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number>(
    Number.isInteger(requestedOrderId) && requestedOrderId > 0
      ? requestedOrderId
      : 0,
  );
  const selectedOrder =
    readyOrders.find((order) => order.id === selectedOrderId) ?? readyOrders[0];
  const orderId = selectedOrder?.id ?? 0;
  const current = trpc.pediu.experience.delivery.current.useQuery(
    { orderId },
    { enabled: orderId > 0, refetchInterval: 8_000 },
  );
  const offer = trpc.pediu.experience.delivery.offer.useMutation({
    onSuccess: () => {
      void current.refetch();
      void orders.refetch();
    },
  });
  const available = (couriers.data ?? []).filter(
    (courier) =>
      courier.linkStatus === "active" &&
      courier.profileStatus === "approved" &&
      courier.availability === "available",
  );

  const callCourier = (courierUserId: number) => {
    if (!orderId || selectedOrder?.status !== "Pronto") return;
    offer.mutate({
      orderId,
      courierUserId,
      idempotencyKey: offerKey(orderId, courierUserId),
      expiresInMinutes: 10,
    });
  };

  return (
    <Page title="Chamar motoboy" eyebrow="OPERAÇÃO DA LOJA">
      <Card>
        <Text style={s.sectionTitle}>Pedidos prontos para sair</Text>
        <Text style={s.muted}>
          O pedido continua em “Pronto” até o motoboy aceitar e enviar a
          posição. Só então ele fica “A caminho”.
        </Text>
        {orders.isLoading ? <Text style={s.muted}>Carregando pedidos...</Text> : null}
        {!orders.isLoading && !readyOrders.length ? (
          <Text style={s.muted}>
            Nenhum pedido de entrega está pronto. Marque o pedido como pronto
            antes de chamar alguém.
          </Text>
        ) : null}
        {readyOrders.map((order) => (
          <Row
            key={order.id}
            icon="two-wheeler"
            title={`Pedido #${order.id}`}
            subtitle={`${order.status} · R$ ${Number(order.total).toFixed(2).replace(".", ",")}`}
            onPress={() => setSelectedOrderId(order.id)}
            right={
              <Text
                style={{
                  color: order.id === orderId ? PEDIU.coral : PEDIU.muted,
                  fontWeight: "900",
                }}
              >
                {order.id === orderId ? "Selecionado" : "Abrir"}
              </Text>
            }
          />
        ))}
      </Card>
      {selectedOrder ? (
        <Card>
          <Text style={s.sectionTitle}>Pedido #{selectedOrder.id}</Text>
          {current.data?.assignment ? (
            <Text style={s.muted}>
              Motoboy: {current.data.assignment.courierName}
              {current.data.assignment.courierPhone
                ? ` · ${current.data.assignment.courierPhone}`
                : ""}
              . Conta #{current.data.assignment.courierId}. Status do pedido:{" "}
              {current.data.status}.
            </Text>
          ) : (
            <Text style={s.muted}>
              Ainda não há motoboy nesta corrida. Escolha alguém disponível da
              sua equipe.
            </Text>
          )}
          {current.data?.latestLocation ? (
            <Text style={s.muted}>
              Última posição recebida:{" "}
              {Number(current.data.latestLocation.latitude).toFixed(5)},{" "}
              {Number(current.data.latestLocation.longitude).toFixed(5)}
            </Text>
          ) : null}
          {selectedOrder.status !== "Pronto" ? (
            <Text style={s.muted}>
              Este pedido já saiu para a rota ou mudou de etapa. Uma nova
              oferta só vale enquanto ele está pronto.
            </Text>
          ) : null}
          {offer.error ? (
            <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
              {offer.error.message}
            </Text>
          ) : null}
          {offer.data?.status === "pending" ? (
            <Text style={{ color: PEDIU.green, fontWeight: "800" }}>
              Oferta enviada. O motoboy vê a corrida na central dele.
            </Text>
          ) : null}
          {!available.length ? (
            <Text style={s.muted}>
              Nenhum motoboy aprovado está disponível. Vincule a conta dele em
              Entregadores e peça para ele ficar “Disponível”.
            </Text>
          ) : null}
          {available.map((courier) => (
            <PrimaryButton
              key={courier.courierUserId}
              title={
                offer.isPending
                  ? "Enviando..."
                  : `Chamar ${courier.name ?? "motoboy"} · conta #${courier.courierUserId}`
              }
              onPress={() => callCourier(courier.courierUserId)}
              disabled={offer.isPending || selectedOrder.status !== "Pronto"}
            />
          ))}
          <OutlineButton
            title="Atualizar equipe e pedidos"
            onPress={() => {
              void couriers.refetch();
              void orders.refetch();
              void current.refetch();
            }}
          />
        </Card>
      ) : null}
    </Page>
  );
}
