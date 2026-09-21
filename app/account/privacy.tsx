import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const CONSENT_VERSION = "1.0";

export default function PrivacyScreen() {
  const { isAuthenticated } = useAuth();
  const consents = trpc.pediu.experience.privacy.mine.useQuery(undefined, { enabled: isAuthenticated });
  const accept = trpc.pediu.experience.privacy.accept.useMutation({ onSuccess: () => consents.refetch() });
  const hasConsent = (kind: "terms" | "privacy") => consents.data?.some((item) => item.kind === kind && item.version === CONSENT_VERSION);

  if (!isAuthenticated) return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back><Card><Text style={s.sectionTitle}>Entre para gerenciar seus consentimentos</Text><Text style={s.muted}>Os controles de privacidade são vinculados à sua sessão.</Text></Card></Page>;

  return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back>
    <Card><Text style={s.sectionTitle}>Dados e privacidade</Text><Text style={s.muted}>Consulte e atualize os consentimentos associados à sua conta. A versão aceita fica registrada com data no servidor.</Text></Card>
    <Card>
      <Text style={s.sectionTitle}>Consentimentos</Text>
      {(["terms", "privacy"] as const).map((kind) => <View key={kind} style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PEDIU.line }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: PEDIU.ink, fontWeight: "900", flex: 1 }}>{kind === "terms" ? "Termos de uso" : "Política de privacidade (LGPD)"}</Text><Text style={{ color: hasConsent(kind) ? PEDIU.green : PEDIU.coral, fontWeight: "900" }}>{hasConsent(kind) ? "Aceito" : "Pendente"}</Text></View>{!hasConsent(kind) ? <PrimaryButton title="Aceitar versão 1.0" onPress={() => accept.mutate({ kind, version: CONSENT_VERSION })} disabled={accept.isPending} /> : null}</View>)}
      {accept.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{accept.error.message}</Text> : null}
    </Card>
    <Card><Text style={s.sectionTitle}>Exclusão da conta</Text><Text style={s.muted}>Para solicitar exclusão ou esclarecer o tratamento dos seus dados, abra um chamado de suporte. O atendimento aplicará as retenções legais e financeiras necessárias.</Text><Pressable onPress={() => router.push("/support" as never)}><Text style={{ color: PEDIU.coral, fontWeight: "900" }}>Solicitar pelo suporte</Text></Pressable></Card>
  </Page>;
}
