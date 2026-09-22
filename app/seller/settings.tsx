import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";

export default function SellerSettingsPage() {
  return <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO">
    <Card>
      <ThemePicker title="Personalize o painel da loja" description="A mesma identidade visual do Pediu fica disponível para cliente e lojista." />
    </Card>
    <Card>
      <Row icon="auto-awesome" title="Assistente do Pediu" subtitle="Atalhos para vendas, fiado, catálogo e divulgação" onPress={() => router.replace({ pathname: "/(tabs)", params: { assistant: "seller" } } as never)} />
      <Row icon="store" title="Dados da loja" subtitle="Nome, telefone e endereço" />
      <Row icon="payment" title="Chave PIX" subtitle="Recebimentos da loja" />
      <Row icon="two-wheeler" title="Entrega" subtitle="Taxa e área de atendimento" />
      <Row icon="notifications" title="Notificações" subtitle="Pedidos e fiado" />
    </Card>
    <Card>
      <Row icon="tune" title="Configurações avançadas" subtitle="Diagnóstico e preferências" onPress={() => router.push("/account/settings/advanced")} />
    </Card>
    <Text style={s.muted}>A aparência, o assistente e as preferências ficam disponíveis nos dois perfis; dados comerciais continuam isolados por loja.</Text>
  </Page>;
}
