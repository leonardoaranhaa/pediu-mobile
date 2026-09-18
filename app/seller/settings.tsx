import { Text } from "react-native";
import { router } from "expo-router";
import { Page, Card, Row, s } from "@/components/pediu-page";

export default function SellerSettingsPage() {
  return (
    <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO">
      <Card>
        <Row icon="store" title="Dados da loja" subtitle="Nome, telefone e endereço" />
        <Row icon="payment" title="Chave PIX" subtitle="Recebimentos da loja" />
        <Row icon="two-wheeler" title="Entrega" subtitle="Taxa e área de atendimento" />
        <Row icon="notifications" title="Notificações" subtitle="Pedidos e fiado" />
      </Card>
      <Card>
        <Row icon="tune" title="Configurações avançadas" subtitle="Diagnóstico e preferências" onPress={() => router.push("/account/settings/advanced")} />
      </Card>
      <Text style={s.muted}>Alterações estruturais da loja serão persistidas em etapas específicas do backend.</Text>
    </Page>
  );
}
