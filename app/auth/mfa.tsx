import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, s } from "@/components/pediu-page";
import { isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";

/**
 * MFA ainda não tem provedor OTP (SMS/WhatsApp/app) no Pediu.
 * Qualquer código digitado aqui não seria validado no servidor.
 */
export default function MfaPage() {
  return (
    <Page title="Verificação em duas etapas" eyebrow="SEGURANÇA">
      <Card>
        <Text style={s.sectionTitle}>Ainda não disponível</Text>
        <Text style={s.body}>
          A verificação em duas etapas (SMS, WhatsApp ou app autenticador) não
          está habilitada. O servidor não valida códigos nesta versão; nenhum
          código digitado seria prova de identidade.
        </Text>
        <Text style={[s.muted, { marginTop: 8 }]}>
          Quando o MFA for ligado, esta tela pedirá um código real emitido pelo
          provedor e só então avançará a sessão.
        </Text>
        {isOAuthConfigured ? (
          <PrimaryButton
            title="Continuar com login seguro"
            onPress={() => void startOAuthLogin()}
          />
        ) : null}
        <OutlineButton
          title="Voltar ao login"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Page>
  );
}
