import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { s } from "@/components/pediu-page";
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

function offerKey(orderId: number, courierUserId: number) {
  const hour = new Date().toISOString().slice(0, 13);
  return `offer-${orderId}-${courierUserId}-${hour}`;
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
    enabled: Boolean(user),
    refetchInterval: 10_000,
  });
  const couriers = trpc.pediu.stores.couriers.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 15_000,
  });
  const activeOrders = useMemo(
    () =>
      (queueQuery.data?.queue ?? []).filter(
        (order) => order.fulfillmentMode !== "pickup",
      ),
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
  const offer = trpc.pediu.experience.delivery.offer.useMutation({
    onSuccess: () => {
      void current.refetch();
      void queueQuery.refetch();
    },
  });
  const broadcast = trpc.pediu.experience.delivery.broadcast.useMutation({
    onSuccess: () => {
      void current.refetch();
      void queueQuery.refetch();
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
            : "Fila Flash e chamada do motoboy"
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
            body="Quando um pedido de entrega estiver Pronto ou A caminho, ele aparece aqui com prioridade Flash."
          />
        ) : null}
        {activeOrders.map((order) => (
          <OpsButton
            key={order.id}
            title={`#${order.id}${order.isFlash ? " · FLASH" : ""} · ${order.status} · ${money(order.total)}`}
            variant={order.id === orderId ? "accent" : "ghost"}
            onPress={() => setSelectedOrderId(order.id)}
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
                flexWrap: "wrap",
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
                  ? `Previsão sugerida: ${selectedOrder.suggestedEtaMinutes ?? queueQuery.data?.flashEtaMaxMinutes ?? 20} min`
                  : "Entrega da fila da loja",
                selectedOrder.deliveryAddress ??
                  "Endereço informado no pedido",
              ]}
            />
            <Text style={s.muted}>
              O pedido continua em “Pronto” até o motoboy aceitar e enviar a
              posição. Só então ele fica “A caminho”.
            </Text>
            {current.data?.assignment ? (
              <Text style={s.muted}>
                Motoboy: {current.data.assignment.courierName}
                {current.data.latestLocation
                  ? ` · última posição ${new Date(current.data.latestLocation.capturedAt).toLocaleString("pt-BR")}`
                  : " · ainda sem posição"}
              </Text>
            ) : null}
            {selectedOrder.status !== "Pronto" ? (
              <Text style={s.muted}>
                A oferta só vale enquanto o pedido está pronto.
              </Text>
            ) : null}
            {offer.error ? (
              <Text style={{ color: "#E20D2A", fontFamily: "Nunito" }}>
                {offer.error.message}
              </Text>
            ) : null}
            {broadcast.error ? (
              <Text style={{ color: "#E20D2A", fontFamily: "Nunito" }}>
                {broadcast.error.message}
              </Text>
            ) : null}
            {offer.data?.status === "pending" || (broadcast.data?.courierUserIds.length ?? 0) > 0 ? (
              <Text style={{ color: "#0E7A45", fontFamily: "Nunito" }}>
                Oferta enviada. Os motoboys perto da loja veem a corrida na central.
              </Text>
            ) : null}
            <OpsButton
              title={
                broadcast.isPending
                  ? "Chamando..."
                  : "Chamar motoboys por perto"
              }
              onPress={() => broadcast.mutate({ orderId })}
              disabled={
                broadcast.isPending ||
                selectedOrder.status !== "Pronto" ||
                Boolean(current.data?.assignment)
              }
            />
            <Text style={s.muted}>
              A chamada vai para motoboys aprovados que estão online perto da loja.
              Não é preciso o número da conta.
            </Text>
            {broadcast.data && broadcast.data.courierUserIds.length === 0 ? (
              <Text style={s.muted}>
                Nenhum motoboy online perto da loja agora. Peça para ele ficar online com a localização ligada.
              </Text>
            ) : null}
            {available.map((courier) => (
              <OpsButton
                key={courier.courierUserId}
                title={
                  offer.isPending
                    ? "Enviando..."
                    : `Chamar ${courier.name ?? "motoboy"} da equipe`
                }
                onPress={() => callCourier(courier.courierUserId)}
                disabled={
                  offer.isPending || selectedOrder.status !== "Pronto"
                }
              />
            ))}
            <OpsButton
              title="Atualizar equipe e pedidos"
              variant="outline"
              onPress={() => {
                void couriers.refetch();
                void queueQuery.refetch();
                void current.refetch();
              }}
            />
          </OpsCard>
          {selectedOrder.status === "A caminho" ? (
            <OpsCard>
              <OpsSectionTitle title="Em rota" />
              <Text style={s.muted}>
                O motoboy conclui esta entrega na central dele. A gorjeta, se
                houver, liquida quando a entrega fecha.
              </Text>
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
