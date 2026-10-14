import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";

function BrandMark() {
  return <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}><Text style={{ color: PEDIU.white, fontSize: 48, fontWeight: "900", fontStyle: "italic", lineHeight: 52 }}>p</Text></View>;
}

export default function RegisterScreen() {
  const loginAvailable = isOAuthConfigured;
  return <Page title="Criar conta" eyebrow="COMECE AGORA" back={false}>
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
      <BrandMark />
      <Text style={{ color: PEDIU.ink, fontSize: 19, fontWeight: "900" }}>Uma conta para todos os seus pedidos</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>Use sua conta Google no portal seguro para criar um cadastro persistido no servidor. Se você já tiver uma conta, o Pediu recupera o mesmo perfil automaticamente.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>Cadastro</Text>
      <PrimaryButton title={loginAvailable ? "Criar conta com Google" : "Cadastro indisponível no preview"} onPress={() => void startOAuthLogin()} disabled={!loginAvailable} />
      {!loginAvailable ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Configure o provedor de autenticação para habilitar cadastro e recuperação de acesso.</Text> : null}
      <OutlineButton title="Já tenho uma conta" onPress={() => router.push("/login")} />
    </Card>
  </Page>;
}
