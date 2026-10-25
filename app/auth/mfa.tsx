import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function MfaPage() {
  return (
    <Page title="Entrar" eyebrow="SEGURANÇA">
      <Card>
        <Text style={s.muted}>
          Entre com seu e-mail e senha.
        </Text>
        <PrimaryButton
          title="Voltar ao login"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Page>
  );
}
