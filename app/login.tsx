import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  return <Page title="Entrar no Pediu" eyebrow="BEM-VINDO" back={false}>
    <View style={{alignItems:"center",gap:10,paddingVertical:20}}><View style={{width:76,height:76,borderRadius:26,backgroundColor:PEDIU.coral,alignItems:"center",justifyContent:"center"}}><MaterialIcons name="local-shipping" size={38} color={PEDIU.white}/></View><Text style={{fontSize:13,color:PEDIU.muted,textAlign:"center",lineHeight:20}}>Peça, venda e acompanhe tudo em um só lugar.</Text></View>
    <Card><Text style={s.sectionTitle}>Login seguro</Text><Text style={s.muted}>O Pediu usa autenticação segura. Seus dados de sessão não ficam expostos no aplicativo.</Text><PrimaryButton title="Entrar com login seguro" onPress={() => void startOAuthLogin()} /><OutlineButton title="Criar uma conta" onPress={() => router.push("/register")} /></Card>
    <View style={{backgroundColor:PEDIU.coralSoft,borderRadius:16,padding:14,flexDirection:"row",gap:10}}><MaterialIcons name="lock" size={19} color={PEDIU.coral}/><Text style={[s.muted,{flex:1}]}>Depois do login, você volta automaticamente ao fluxo que estava usando.</Text></View>
  </Page>;
}