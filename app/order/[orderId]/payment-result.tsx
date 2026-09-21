import { Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function PaymentResultPage() {
  const { orderId, status = "pending" } = useLocalSearchParams<{ orderId: string; status?: string }>();
  const success = status === "success" || status === "approved";
  return <Page title={success ? "Pagamento confirmado" : "Pagamento em processamento"} eyebrow="PAGAMENTO">
    <Card>
      <Text style={s.sectionTitle}>Pedido #{orderId}</Text>
      <Text style={s.body}>{success ? "Seu pagamento foi confirmado e o pedido seguirá para processamento." : "Estamos aguardando a confirmação do pagamento."}</Text>
    </Card>
    <PrimaryButton title="Acompanhar pedido" onPress={() => router.push(`/order/${orderId}/tracking-map` as never)} />
  </Page>;
}
