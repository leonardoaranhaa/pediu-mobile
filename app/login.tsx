import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";

function BrandMark() {
  return <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}><Text style={{ color: PEDIU.white, fontSize: 48, fontWeight: "900", fontStyle: "italic", lineHeight: 52 }}>p</Text></View>;
}

export default function LoginScreen() {
  const loginAvailable = isOAuthConfigured;
  return <Page title="Entrar no Pediu" eyebrow="BEM-VINDO" back={false}>
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 18 }}>
      <BrandMark />
      <Text style={{ color: PEDIU.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 }}>Pediu</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 300 }]}>Peça, venda e acompanhe tudo em um só lugar.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>Login seguro</Text>
      <Text style={s.muted}>Entre com a autenticação segura do Pediu. Depois do acesso, você volta para o fluxo que estava usando.</Text>
      <PrimaryButton title={loginAvailable ? "Entrar com login seguro" : "Login indisponível no preview"} onPress={() => void startOAuthLogin()} disabled={!loginAvailable} />
      <OutlineButton title="Criar uma conta" onPress={() => router.push("/register")} />
      {!loginAvailable ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>O provedor de autenticação ainda não foi configurado neste ambiente.</Text> : null}
    </Card>
    <View style={{ backgroundColor: PEDIU.coralSoft, borderRadius: 18, padding: 15, flexDirection: "row", gap: 10 }}>
      <MaterialIcons name="lock" size={19} color={PEDIU.coral} />
      <Text style={[s.muted, { flex: 1 }]}>Sua sessão é tratada pelo fluxo de autenticação do aplicativo, sem expor credenciais na interface.</Text>
    </View>
  </Page>;
}
