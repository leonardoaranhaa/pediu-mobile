import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function OrderPaymentPage() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Number(orderId);
  const orderQuery = trpc.pediu.orders.get.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0 });
  const createPix = trpc.pediu.payments.createPix.useMutation();

  const generatePix = () => {
    if (!id) return;
    createPix.mutate({ orderId: id });
  };

  if (!Number.isInteger(id) || id <= 0) return <Page title="Pagamento" eyebrow="PEDIDO"><Card><Text style={s.sectionTitle}>Pedido inválido</Text></Card></Page>;
  if (orderQuery.isLoading) return <Page title="Pagamento" eyebrow={`PEDIDO #${id}`}><Card><Text style={s.sectionTitle}>Carregando pedido...</Text></Card></Page>;
  if (orderQuery.isError || !orderQuery.data) return <Page title="Pagamento" eyebrow={`PEDIDO #${id}`}><Card><Text style={s.sectionTitle}>Pedido não encontrado</Text><Text style={s.muted}>Não foi possível consultar este pedido.</Text></Card></Page>;

  return <Page title="Pagamento PIX" eyebrow={`PEDIDO #${id}`}>
    <Card>
      <MaterialIcons name="pix" size={38} color={PEDIU.coral} />
      <Text style={s.sectionTitle}>Pagamento seguro pelo fluxo do pedido</Text>
      <Text style={s.muted}>Valor: R$ {Number(orderQuery.data.total).toFixed(2).replace(".", ",")}</Text>
      {createPix.data ? <>
        <Text style={s.muted}>Status: {createPix.data.status === "pending" ? "aguardando pagamento" : createPix.data.status}</Text>
        {createPix.data.checkoutUrl ? <PrimaryButton title="Abrir pagamento PIX" onPress={() => void Linking.openURL(createPix.data!.checkoutUrl!)} /> : null}
      </> : <PrimaryButton title={createPix.isPending ? "Gerando PIX..." : "Gerar pagamento PIX"} disabled={createPix.isPending} onPress={generatePix} />}
      {createPix.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{createPix.error.message}</Text> : null}
    </Card>
  </Page>;
}
