import { router } from "expo-router";
import { Linking, Text } from "react-native";
import {
  Page,
  Card,
  PrimaryButton,
  OutlineButton,
  PEDIU,
  s,
} from "@/components/pediu-page";
import {
  isOAuthConfigured,
  OAUTH_PORTAL_URL,
  startOAuthLogin,
} from "@/constants/oauth";

/**
 * O Pediu autentica via OAuth externo — não há senha local no app.
 * Esta tela não pode prometer e-mail de reset que o backend não envia.
 */
export default function ForgotPasswordScreen() {
  const portal = OAUTH_PORTAL_URL.replace(/\/$/, "");
  const openProviderHelp = () => {
    if (portal) {
      void Linking.openURL(portal);
      return;
    }
    void startOAuthLogin();
  };

  return (
    <Page title="Recuperar acesso" eyebrow="SEGURANÇA" back>
      <Card>
        <Text style={s.sectionTitle}>Sem senha local no Pediu</Text>
        <Text style={s.body}>
          O acesso usa o login seguro do provedor de autenticação. Não existe
          senha armazenada neste aplicativo e, por isso, não enviamos e-mail de
          “esqueci minha senha” a partir desta tela.
        </Text>
        <Text style={[s.muted, { marginTop: 8 }]}>
          Para recuperar a conta, use a opção de recuperação do próprio provedor
          (portal de autenticação) ou tente entrar novamente com o mesmo método
          que você já utilizou.
        </Text>
        {isOAuthConfigured ? (
          <>
            <PrimaryButton
              title="Abrir login seguro"
              onPress={() => void startOAuthLogin()}
            />
            <OutlineButton
              title="Abrir portal de autenticação"
              onPress={openProviderHelp}
            />
          </>
        ) : (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            O provedor de autenticação ainda não está configurado neste
            ambiente. Configure EXPO_PUBLIC_OAUTH_PORTAL_URL e
            EXPO_PUBLIC_APP_ID para habilitar o acesso.
          </Text>
        )}
        <OutlineButton
          title="Voltar para entrar"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Page>
  );
}
