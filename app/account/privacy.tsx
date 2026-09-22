import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const CONSENT_VERSION = "1.0";

export default function PrivacyScreen() {
  const { isAuthenticated } = useAuth();
  const consents = trpc.pediu.experience.privacy.mine.useQuery(undefined, { enabled: isAuthenticated });
  const exportData = trpc.pediu.experience.privacy.export.useQuery(undefined, { enabled: false });
  const accept = trpc.pediu.experience.privacy.accept.useMutation({ onSuccess: () => void consents.refetch() });
  const requestDeletion = trpc.pediu.experience.privacy.requestDeletion.useMutation();
  const hasConsent = (kind: "terms" | "privacy") => consents.data?.some((item) => item.kind === kind && item.version === CONSENT_VERSION);

  if (!isAuthenticated) return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back><Card><Text style={s.sectionTitle}>Entre para gerenciar seus consentimentos</Text><Text style={s.muted}>Os controles de privacidade são vinculados à sua sessão.</Text></Card></Page>;

  return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back>
    <Card><Text style={s.sectionTitle}>Dados e privacidade</Text><Text style={s.muted}>Consulte e atualize consentimentos, exporte um resumo dos seus dados e solicite exclusão assistida sem apagar registros financeiros automaticamente.</Text></Card>
    <Card>
      <Text style={s.sectionTitle}>Consentimentos</Text>
      {(["terms", "privacy"] as const).map((kind) => <View key={kind} style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PEDIU.line }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: PEDIU.ink, fontWeight: "900", flex: 1 }}>{kind === "terms" ? "Termos de uso" : "Política de privacidade (LGPD)"}</Text><Text style={{ color: hasConsent(kind) ? PEDIU.green : PEDIU.coral, fontWeight: "900" }}>{hasConsent(kind) ? "Aceito" : "Pendente"}</Text></View>{!hasConsent(kind) ? <PrimaryButton title="Aceitar versão 1.0" onPress={() => accept.mutate({ kind, version: CONSENT_VERSION })} disabled={accept.isPending} /> : null}</View>)}
      {accept.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{accept.error.message}</Text> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Exportar meus dados</Text>
      <Text style={s.muted}>Gera um resumo estruturado do perfil, endereços, pedidos, avisos, consentimentos e chamados da sua conta.</Text>
      <PrimaryButton title={exportData.isFetching ? "Preparando..." : "Consultar exportação"} onPress={() => void exportData.refetch()} disabled={exportData.isFetching} />
      {exportData.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{exportData.error.message}</Text> : null}
      {exportData.data ? <Text selectable style={{ color: PEDIU.ink, fontSize: 11, lineHeight: 16 }}>{JSON.stringify(exportData.data, null, 2)}</Text> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Exclusão assistida</Text>
      <Text style={s.muted}>A solicitação cria um chamado para análise. Retenções legais e financeiras serão avaliadas antes de qualquer exclusão.</Text>
      <PrimaryButton title={requestDeletion.isPending ? "Solicitando..." : "Solicitar exclusão"} onPress={() => requestDeletion.mutate()} disabled={requestDeletion.isPending} />
      {requestDeletion.data ? <Text style={{ color: PEDIU.green, fontSize: 12 }}>Solicitação registrada no chamado #{requestDeletion.data.ticketId}.</Text> : null}
      {requestDeletion.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{requestDeletion.error.message}</Text> : null}
    </Card>
  </Page>;
}
