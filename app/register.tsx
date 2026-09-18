import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { startOAuthLogin } from "@/constants/oauth";

export default function RegisterScreen() {
  return <Page title="Criar conta" eyebrow="COMECE AGORA" back={false}>
    <View style={{paddingVertical:16,gap:8}}><Text style={{fontSize:18,fontWeight:"900",color:PEDIU.ink}}>Uma conta para todos os seus pedidos</Text><Text style={s.muted}>Crie seu acesso pelo login seguro e use a mesma conta para comprar. Se sua conta tiver perfil de vendedor, o modo loja será liberado automaticamente.</Text></View>
    <Card><Text style={s.sectionTitle}>Cadastro</Text><PrimaryButton title="Continuar com login seguro" onPress={() => void startOAuthLogin()} /><OutlineButton title="Já tenho uma conta" onPress={() => router.push("/login")} /></Card>
  </Page>;
}