import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, Linking, Text } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function OrderPaymentPage() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Number(orderId);
  const orderQuery = trpc.pediu.orders.get.useQuery(
    { orderId: id },
    { enabled: Number.isInteger(id) && id > 0 },
  );
  const createPix = trpc.pediu.payments.createPix.useMutation();

  const generatePix = () => {
    if (!id) return;
    createPix.mutate({ orderId: id });
  };

  if (!Number.isInteger(id) || id <= 0)
    return (
      <Page title="Pagamento" eyebrow="PEDIDO">
        <Card>
          <Text style={s.sectionTitle}>Pedido inválido</Text>
        </Card>
      </Page>
    );
  if (orderQuery.isLoading)
    return (
      <Page title="Pagamento" eyebrow={`PEDIDO #${id}`}>
        <Card>
          <Text style={s.sectionTitle}>Carregando pedido...</Text>
        </Card>
      </Page>
    );
  if (orderQuery.isError || !orderQuery.data)
    return (
      <Page title="Pagamento" eyebrow={`PEDIDO #${id}`}>
        <Card>
          <Text style={s.sectionTitle}>Pedido não encontrado</Text>
          <Text style={s.muted}>Não foi possível consultar este pedido.</Text>
        </Card>
      </Page>
    );

  return (
    <Page title="Pagamento PIX" eyebrow={`PEDIDO #${id}`}>
      <Card>
        <MaterialIcons name="pix" size={38} color={PEDIU.coral} />
        <Text style={s.sectionTitle}>
          Pagamento seguro pelo fluxo do pedido
        </Text>
        <Text style={s.muted}>
          Valor: R$ {Number(orderQuery.data.total).toFixed(2).replace(".", ",")}
        </Text>
        {createPix.data ? (
          <>
            <Text style={s.muted}>
              Status:{" "}
              {createPix.data.status === "pending"
                ? "aguardando pagamento"
                : createPix.data.status === "paid"
                  ? "confirmado"
                  : createPix.data.status === "cancelled"
                    ? "cancelado"
                    : "recusado"}
            </Text>
            {createPix.data.status === "pending" &&
            createPix.data.qrCodeBase64 ? (
              <Image
                accessibilityLabel="QR Code Pix do pedido"
                source={{
                  uri: `data:image/png;base64,${createPix.data.qrCodeBase64}`,
                }}
                resizeMode="contain"
                style={{ width: 220, height: 220, alignSelf: "center" }}
              />
            ) : null}
            {createPix.data.status === "pending" && createPix.data.qrCode ? (
              <Text selectable style={s.muted}>
                Pix copia e cola: {createPix.data.qrCode}
              </Text>
            ) : null}
            {createPix.data.status === "pending" && createPix.data.ticketUrl ? (
              <PrimaryButton
                title="Abrir pagamento PIX"
                onPress={() => void Linking.openURL(createPix.data!.ticketUrl!)}
              />
            ) : null}
            {createPix.data.status === "failed" ? (
              <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
                O Mercado Pago recusou a cobrança. Crie um novo pedido para
                tentar novamente.
              </Text>
            ) : null}
            {createPix.data.status === "paid" ? (
              <Text style={s.muted}>
                Pagamento confirmado pelo Mercado Pago.
              </Text>
            ) : null}
            {createPix.data.status === "cancelled" ? (
              <Text style={s.muted}>Esta cobrança PIX foi cancelada.</Text>
            ) : null}
          </>
        ) : (
          <PrimaryButton
            title={
              createPix.isPending ? "Gerando PIX..." : "Gerar pagamento PIX"
            }
            disabled={createPix.isPending}
            onPress={generatePix}
          />
        )}
        {createPix.isError ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            {createPix.error.message}
          </Text>
        ) : null}
      </Card>
    </Page>
  );
}
