import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function MfaPage() {
  return (
    <Page title="Verificação indisponível" eyebrow="SEGURANÇA">
      <Card>
        <Text style={s.body}>
          A verificação em duas etapas ainda não está habilitada. O servidor não
          valida códigos nesta versão; nenhum código digitado seria uma prova de
          identidade.
        </Text>
        <PrimaryButton
          title="Voltar ao login"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Page>
  );
}
