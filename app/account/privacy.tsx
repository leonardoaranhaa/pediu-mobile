import { Alert, Pressable, Text, View } from "react-native";
import { Page, Card, PEDIU, s } from "@/components/pediu-page";

export default function PrivacyScreen() {
  const confirmDeletion = () => Alert.alert("Excluir conta", "Esta ação deverá ser executada pelo backend após confirmação e período de retenção aplicável.", [{ text: "Cancelar", style: "cancel" }, { text: "Continuar", style: "destructive" }]);
  return <Page title="Segurança e privacidade" eyebrow="SUA CONTA" back>
    <Card><Text style={s.sectionTitle}>Dados e privacidade</Text><Text style={s.muted}>Consulte os termos, política de privacidade, permissões e controles de dados da sua conta.</Text></Card>
    <Card><Text style={s.sectionTitle}>Conta</Text><View style={{ gap: 12 }}><Pressable><Text style={{ color: PEDIU.ink, fontWeight: "800" }}>Termos de uso</Text></Pressable><Pressable><Text style={{ color: PEDIU.ink, fontWeight: "800" }}>Política de privacidade (LGPD)</Text></Pressable><Pressable onPress={confirmDeletion}><Text style={{ color: PEDIU.coral, fontWeight: "900" }}>Solicitar exclusão da conta</Text></Pressable></View></Card>
  </Page>;
}
