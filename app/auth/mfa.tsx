import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function MfaPage() {
  return (
    <Page title="Verificação indisponível" eyebrow="SEGURANÇA">
      <Card>
        <Text style={s.body}>
          A verificação extra não está disponível neste ambiente. Volte ao login
          e use o provedor seguro para concluir sua autenticação.
        </Text>
        <PrimaryButton
          title="Voltar ao login"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Page>
  );
}
