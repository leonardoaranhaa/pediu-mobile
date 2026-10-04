import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { getApiBaseUrl } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const CONSENT_VERSION = "1.0";

function legalUrl(path: "/legal/privacy" | "/legal/terms") {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function DocumentLink({ label, path }: { label: string; path: "/legal/privacy" | "/legal/terms" }) {
  const url = legalUrl(path);
  return <Pressable onPress={() => void Linking.openURL(url)} style={{ minHeight: 44, justifyContent: "center" }}>
    <Text style={{ color: PEDIU.coral, fontWeight: "900" }}>{label}</Text>
    <Text selectable style={{ color: PEDIU.muted, fontSize: 12 }}>{url}</Text>
  </Pressable>;
}

export default function PrivacyScreen() {
  const { isAuthenticated, logout } = useAuth();
  const [closed, setClosed] = useState(false);
  const consents = trpc.pediu.experience.privacy.mine.useQuery(undefined, { enabled: isAuthenticated });
  const exportData = trpc.pediu.experience.privacy.export.useQuery(undefined, { enabled: false });
  const accept = trpc.pediu.experience.privacy.accept.useMutation({ onSuccess: () => void consents.refetch() });
  const requestDeletion = trpc.pediu.experience.privacy.requestDeletion.useMutation({
    onSuccess: async () => {
      setClosed(true);
      try { await logout(); } catch { /* the server already cleared the session cookie */ }
    },
  });
  const hasConsent = (kind: "terms" | "privacy") => consents.data?.some((item) => item.kind === kind && item.version === CONSENT_VERSION);

  if (closed) return <Page title="Conta encerrada" eyebrow="SUA CONTA" back={false}>
    <Card>
      <Text style={s.sectionTitle}>Sua conta foi encerrada</Text>
      <Text style={s.muted}>Nome, e-mail, endereços, identificador de login e mensagens foram removidos. Pedidos e pagamentos permanecem apenas pelo prazo legal, sem o identificador de login.</Text>
    </Card>
  </Page>;

  return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back>
    <Card>
      <Text style={s.sectionTitle}>Dados e privacidade</Text>
      <Text style={s.muted}>A política e os termos ficam publicados no servidor. O encerramento da conta apaga os dados pessoais na hora e conserva pedidos e pagamentos pelo prazo legal.</Text>
      <DocumentLink label="Ler a política de privacidade" path="/legal/privacy" />
      <DocumentLink label="Ler os termos de uso" path="/legal/terms" />
    </Card>
    {!isAuthenticated ? <Card><Text style={s.sectionTitle}>Entre para gerenciar sua conta</Text><Text style={s.muted}>Exportação e exclusão exigem a sessão da conta que será encerrada.</Text></Card> : <>
    <Card>
      <Text style={s.sectionTitle}>Consentimentos</Text>
      {(["terms", "privacy"] as const).map((kind) => <View key={kind} style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PEDIU.line }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: PEDIU.ink, fontWeight: "900", flex: 1 }}>{kind === "terms" ? "Termos de uso 1.0" : "Política de privacidade 1.0"}</Text>
          <Text style={{ color: hasConsent(kind) ? PEDIU.green : PEDIU.coral, fontWeight: "900" }}>{hasConsent(kind) ? "Aceito" : "Pendente"}</Text>
        </View>
        {!hasConsent(kind) ? <PrimaryButton title="Li e aceito a versão 1.0" onPress={() => accept.mutate({ kind, version: CONSENT_VERSION })} disabled={accept.isPending} /> : null}
      </View>)}
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
      <Text style={s.sectionTitle}>Encerrar conta</Text>
      <Text style={s.muted}>Isso apaga o perfil, os endereços, a sessão e o identificador de login. Pedidos e pagamentos ficam sem esses dados, pelo prazo legal. A ação não abre chamado.</Text>
      <PrimaryButton title={requestDeletion.isPending ? "Encerrando..." : "Encerrar minha conta"} onPress={() => requestDeletion.mutate()} disabled={requestDeletion.isPending} />
      {requestDeletion.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{requestDeletion.error.message}</Text> : null}
    </Card>
    </>}
  </Page>;
}
