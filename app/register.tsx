import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { startOAuthLogin } from "@/constants/oauth";

function BrandMark() {
  return <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}><Text style={{ color: PEDIU.white, fontSize: 48, fontWeight: "900", fontStyle: "italic", lineHeight: 52 }}>p</Text></View>;
}

export default function RegisterScreen() {
  return <Page title="Criar conta" eyebrow="COMECE AGORA" back={false}>
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
      <BrandMark />
      <Text style={{ color: PEDIU.ink, fontSize: 19, fontWeight: "900" }}>Uma conta para todos os seus pedidos</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>Use o login seguro para criar ou acessar sua conta. Se houver perfil de vendedor, o modo loja será liberado automaticamente.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>Cadastro</Text>
      <PrimaryButton title="Continuar com login seguro" onPress={() => void startOAuthLogin()} />
      <OutlineButton title="Já tenho uma conta" onPress={() => router.push("/login")} />
    </Card>
  </Page>;
}
