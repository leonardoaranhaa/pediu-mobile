import { router } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { Card, Page, s } from "@/components/pediu-page";

export default function RetiredOAuthCallback() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/login"), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Page title="Entrar" eyebrow="PEDIU">
      <Card>
        <Text style={s.sectionTitle}>O login antigo foi desligado</Text>
        <Text style={s.muted}>Agora a entrada é com e-mail e senha do próprio Pediu.</Text>
      </Card>
    </Page>
  );
}
