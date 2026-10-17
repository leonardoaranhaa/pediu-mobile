import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, s } from "@/components/pediu-page";
import { isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";

export default function ForgotPasswordScreen() {
  return (
    <Page title="Recuperar acesso" eyebrow="SEGURANÇA" back>
      <Card>
        <Text style={s.sectionTitle}>A senha não fica neste aplicativo</Text>
        <Text style={s.muted}>
          O Pediu entra por um login seguro de fora do aplicativo. Aqui não dá
          para enviar um e-mail de nova senha, e nenhum aviso de “e-mail
          enviado” será mostrado porque essa mensagem seria falsa.
        </Text>
        <Text style={s.muted}>
          Se você esqueceu a senha, recupere no mesmo serviço em que criou a
          conta e depois volte para entrar.
        </Text>
        <PrimaryButton
          title={isOAuthConfigured ? "Abrir o login seguro" : "Voltar para entrar"}
          onPress={() => {
            if (isOAuthConfigured) void startOAuthLogin();
            else router.replace("/login");
          }}
        />
        <OutlineButton title="Voltar" onPress={() => router.back()} />
      </Card>
    </Page>
  );
}
