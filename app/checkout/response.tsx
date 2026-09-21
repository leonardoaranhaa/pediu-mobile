import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Page, Card, PrimaryButton, Row, s } from "@/components/pediu-page";

export default function CheckoutResponsePage() {
  const [status, setStatus] = useState<"review" | "processing" | "success">("review");
  const summary = useMemo(() => ({ subtotal: "R$ 0,00", delivery: "R$ 0,00", service: "R$ 0,00", total: "R$ 0,00" }), []);
  const confirm = () => { setStatus("processing"); setTimeout(() => setStatus("success"), 600); };
  return <Page title="Finalizar pedido" eyebrow="CHECKOUT">
    <Card>
      <Row icon="location-on" title="Endereço de entrega" subtitle="Selecione um endereço salvo" />
      <Row icon="payments" title="Pagamento" subtitle="Escolha a forma de pagamento" />
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Resumo</Text>
      <Row title="Subtotal" subtitle={summary.subtotal} />
      <Row title="Entrega" subtitle={summary.delivery} />
      <Row title="Taxa de serviço" subtitle={summary.service} />
      <View style={s.divider} />
      <Row title="Total" subtitle={summary.total} />
    </Card>
    <PrimaryButton title={status === "processing" ? "Processando..." : status === "success" ? "Pedido confirmado" : "Confirmar pedido"} disabled={status !== "review"} onPress={confirm} />
    {status === "success" && <Text style={s.muted}>Seu pedido foi encaminhado para processamento.</Text>}
  </Page>;
}
