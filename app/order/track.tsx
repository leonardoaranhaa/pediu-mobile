import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Linking, Pressable, Text, View } from "react-native";
import {
  Page,
  Card,
  OutlineButton,
  PrimaryButton,
  PEDIU,
  s,
} from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

const states = [
  "Pendente",
  "Aceito",
  "Preparando",
  "Pronto",
  "A caminho",
  "Entregue",
] as const;

type OrderStatusLabel = (typeof states)[number] | "Cancelado";

function statusHint(status: string): string {
  switch (status as OrderStatusLabel) {
    case "Pendente":
      return "Aguardando a loja aceitar o pedido.";
    case "Aceito":
      return "A loja confirmou e vai preparar seu pedido.";
    case "Preparando":
      return "Seu pedido está sendo preparado agora.";
    case "Pronto":
      return "Pedido pronto. Em breve sai para entrega ou retirada.";
    case "A caminho":
      return "O entregador está a caminho. Acompanhe a posição e o chat.";
    case "Entregue":
      return "Pedido entregue. Você já pode avaliar a experiência.";
    case "Cancelado":
      return "Este pedido foi cancelado.";
    default:
      return "Status atualizado pelo servidor.";
  }
}

export default function TrackOrderPage() {
  const params = useLocalSearchParams<{
    orderId?: string;
    paymentId?: string;
    pixUrl?: string;
  }>();
  const orderId = Number(params.orderId);
  const paymentId = Number(params.paymentId);
  const pixUrl = typeof params.pixUrl === "string" ? params.pixUrl : "";
  const enabled = Number.isInteger(orderId) && orderId > 0;

  const query = trpc.pediu.orders.get.useQuery(
    { orderId },
    { enabled, refetchInterval: 5000 },
  );
  const paymentQuery = trpc.pediu.payments.get.useQuery(
    { paymentId },
    {
      enabled: Number.isInteger(paymentId) && paymentId > 0,
      refetchInterval: 5000,
    },
  );
  const deliveryQuery = trpc.pediu.experience.delivery.current.useQuery(
    { orderId },
    {
      enabled,
      refetchInterval: 8000,
      retry: 1,
    },
  );

  if (!enabled) {
    return (
      <Page title="Acompanhar pedido" eyebrow="PEDIDO">
        <Card>
          <Text style={s.sectionTitle}>Pedido inválido</Text>
          <Text style={s.muted}>
            Abra o acompanhamento a partir de um pedido válido na lista Meus
            pedidos ou na confirmação do checkout.
          </Text>
        </Card>
      </Page>
    );
  }

  if (query.isLoading) {
    return (
      <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}>
        <Card>
          <Text style={s.sectionTitle}>Carregando pedido...</Text>
          <Text style={s.muted}>
            Buscando status, pagamento e entrega no servidor.
          </Text>
        </Card>
      </Page>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${orderId}`}>
        <Card>
          <Text style={s.sectionTitle}>Não foi possível carregar</Text>
          <Text style={s.muted}>
            Este pedido não existe ou não está disponível para sua conta.
          </Text>
          <OutlineButton
            title="Ver meus pedidos"
            onPress={() => router.push("/orders" as never)}
          />
        </Card>
      </Page>
    );
  }

  const order = query.data;
  const active =
    order.status === "Cancelado"
      ? -1
      : states.indexOf(order.status as (typeof states)[number]);
  const paymentLink = paymentQuery.data?.pixTicketUrl || pixUrl;
  const assignment = deliveryQuery.data?.assignment;
  const freshness = deliveryQuery.data?.locationFreshness ?? "unavailable";
  const showDeliveryActions =
    order.status !== "Cancelado" && order.status !== "Pendente";
  const showMap =
    order.status === "Pronto" ||
    order.status === "A caminho" ||
    order.status === "Entregue";
  const showFeedback = order.status === "Entregue";

  return (
    <Page title="Acompanhar pedido" eyebrow={`PEDIDO #${order.id}`}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: PEDIU.coralSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={
                order.status === "Entregue"
                  ? "check-circle"
                  : order.status === "Cancelado"
                    ? "cancel"
                    : "delivery-dining"
              }
              size={22}
              color={
                order.status === "Cancelado" ? PEDIU.muted : PEDIU.coral
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Pedido #{order.id}</Text>
            <Text style={s.muted}>Status: {order.status}</Text>
          </View>
        </View>

        <Text style={[s.body, { marginTop: 4 }]}>{statusHint(order.status)}</Text>

        <Text style={[s.muted, { marginTop: 6 }]}>
          Total: R$ {Number(order.total).toFixed(2).replace(".", ",")}
        </Text>
        {order.deliveryAddress ? (
          <Text style={s.muted}>Entrega: {order.deliveryAddress}</Text>
        ) : null}

        {assignment ? (
          <View
            style={{
              marginTop: 8,
              backgroundColor: PEDIU.peach,
              borderRadius: 14,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={s.sectionTitle}>Entrega</Text>
            <Text style={s.muted}>
              {assignment.courierName}
              {assignment.courierPhone ? ` · ${assignment.courierPhone}` : ""}
            </Text>
            {assignment.etaMinutes != null ? (
              <Text style={{ color: PEDIU.coral, fontWeight: "900", fontSize: 13 }}>
                ETA estimado: {assignment.etaMinutes} min
              </Text>
            ) : null}
            {deliveryQuery.data?.latestLocation ? (
              <Text style={s.muted}>
                Posição:{" "}
                {Number(deliveryQuery.data.latestLocation.latitude).toFixed(5)},{" "}
                {Number(deliveryQuery.data.latestLocation.longitude).toFixed(5)}
                {" · "}
                {freshness === "fresh"
                  ? "atualizada"
                  : freshness === "stale"
                    ? "desatualizada"
                    : "indisponível"}
              </Text>
            ) : (
              <Text style={s.muted}>Aguardando posição do entregador.</Text>
            )}
            {deliveryQuery.isError ? (
              <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
                Não foi possível atualizar a entrega. O status do pedido acima
                continua válido.
              </Text>
            ) : null}
          </View>
        ) : order.status === "Pronto" || order.status === "A caminho" ? (
          <Text style={[s.muted, { marginTop: 8 }]}>
            Aguardando atribuição do entregador pela loja.
          </Text>
        ) : null}

        {paymentQuery.data ? (
          <View
            style={{
              marginTop: 10,
              backgroundColor:
                paymentQuery.data.status === "paid" ? "#EAF9F1" : PEDIU.peach,
              borderRadius: 15,
              padding: 13,
              gap: 5,
            }}
          >
            <Text style={s.sectionTitle}>
              Pagamento:{" "}
              {paymentQuery.data.status === "paid"
                ? "confirmado"
                : paymentQuery.data.status === "failed"
                  ? "falhou"
                  : paymentQuery.data.status === "cancelled"
                    ? "cancelado"
                    : "aguardando confirmação"}
            </Text>
            <Text style={s.muted}>
              Método:{" "}
              {paymentQuery.data.method === "pix"
                ? "PIX"
                : paymentQuery.data.method === "card"
                  ? "Cartão"
                  : "Dinheiro"}
            </Text>
            {paymentQuery.data.method === "pix" &&
            paymentQuery.data.status === "pending" &&
            paymentQuery.data.pixQrCodeBase64 ? (
              <Image
                accessibilityLabel="QR Code Pix do pedido"
                source={{
                  uri: `data:image/png;base64,${paymentQuery.data.pixQrCodeBase64}`,
                }}
                resizeMode="contain"
                style={{ width: 200, height: 200, alignSelf: "center" }}
              />
            ) : null}
            {paymentQuery.data.method === "pix" &&
            paymentQuery.data.status === "pending" &&
            paymentQuery.data.pixQrCode ? (
              <Text selectable style={s.muted}>
                Pix copia e cola: {paymentQuery.data.pixQrCode}
              </Text>
            ) : null}
            {paymentQuery.data.method === "pix" &&
            paymentQuery.data.status === "pending" &&
            paymentLink ? (
              <Pressable
                onPress={() => void Linking.openURL(paymentLink)}
                style={{
                  marginTop: 5,
                  backgroundColor: PEDIU.coral,
                  minHeight: 44,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: PEDIU.white,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Abrir pagamento PIX
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {states.map((state, i) => (
          <View
            key={state}
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: i <= active ? PEDIU.coral : PEDIU.line,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: i <= active ? PEDIU.ink : PEDIU.muted,
                }}
              >
                {state}
              </Text>
              {i === active ? (
                <Text style={s.muted}>{statusHint(state)}</Text>
              ) : null}
            </View>
          </View>
        ))}

        {order.status === "Cancelado" ? (
          <Text style={s.muted}>Este pedido foi cancelado.</Text>
        ) : null}
      </Card>

      {showDeliveryActions ? (
        <Card>
          <Text style={s.sectionTitle}>Ações do pedido</Text>
          <Text style={s.muted}>
            Dados vindos do servidor (pedido, entrega e chat). Atualização
            automática a cada poucos segundos.
          </Text>
          {showMap ? (
            <OutlineButton
              title="Ver entregador e posição"
              onPress={() =>
                router.push({
                  pathname: "/order/[orderId]/tracking-map",
                  params: { orderId: String(order.id) },
                })
              }
            />
          ) : null}
          <OutlineButton
            title="Chat do pedido"
            onPress={() =>
              router.push({
                pathname: "/order/[orderId]/chat",
                params: { orderId: String(order.id) },
              })
            }
          />
          {showFeedback ? (
            <PrimaryButton
              title="Avaliar experiência"
              onPress={() =>
                router.push({
                  pathname: "/feedback/[orderId]",
                  params: { orderId: String(order.id) },
                })
              }
            />
          ) : null}
        </Card>
      ) : null}
    </Page>
  );
}
