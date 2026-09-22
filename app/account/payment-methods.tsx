import { Text } from "react-native";
import { Page, Card, ToggleRow, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function PaymentMethodsPage() {
  const { isAuthenticated } = useAuth();
  const preferences = trpc.pediu.account.paymentPreferences.mine.useQuery(undefined, { enabled: isAuthenticated });
  const update = trpc.pediu.account.paymentPreferences.update.useMutation({ onSuccess: () => void preferences.refetch() });
  if (!isAuthenticated) return <Page title="Pagamentos" eyebrow="COMO VOCÊ PAGA"><Card><Text style={s.sectionTitle}>Entre para gerenciar suas preferências</Text><Text style={s.muted}>Nenhum dado de cartão é armazenado nesta tela.</Text></Card></Page>;
  const pref = preferences.data;
  return <Page title="Pagamentos" eyebrow="COMO VOCÊ PAGA">
    <Card>
      <Text style={s.sectionTitle}>Preferências de checkout</Text>
      <Text style={s.muted}>Essas opções controlam os métodos exibidos para você. Elas não representam uma cobrança nem armazenam dados de cartão.</Text>
      {preferences.isLoading ? <Text style={s.muted}>Carregando preferências...</Text> : null}
      {pref ? <>
        <ToggleRow icon="pix" title="PIX" subtitle="Disponível para checkout" value={pref.pixEnabled === 1} onChange={(value) => update.mutate({ pixEnabled: value })} />
        <ToggleRow icon="credit-card" title="Cartão" subtitle="Preferência de pagamento" value={pref.cardEnabled === 1} onChange={(value) => update.mutate({ cardEnabled: value })} />
        <ToggleRow icon="payments" title="Dinheiro" subtitle="Pagamento na entrega" value={pref.cashEnabled === 1} onChange={(value) => update.mutate({ cashEnabled: value })} />
      </> : null}
      {update.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{update.error.message}</Text> : null}
    </Card>
    <Card><Text style={s.sectionTitle}>Fiado</Text><Text style={s.muted}>Disponível apenas quando uma loja habilitar seu crédito. A aprovação fica registrada no servidor.</Text></Card>
  </Page>;
}
