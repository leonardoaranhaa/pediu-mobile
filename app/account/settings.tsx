import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";
import { useAppPreferences } from "@/lib/app-preferences";

export default function SettingsPage() {
  const { theme } = useAppPreferences();
  return <Page title="Configurações" eyebrow="PREFERÊNCIAS">
    <View style={{ backgroundColor: theme.ink, borderRadius: 26, padding: 19, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialIcons name="auto-awesome" size={18} color={theme.highlight} /><Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }}>O PEDIU É SEU</Text></View>
      <Text style={{ color: "#FFFFFF", fontSize: 22, lineHeight: 27, fontWeight: "900", letterSpacing: -0.5 }}>O app de delivery de sempre, só que do seu jeito.</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12, lineHeight: 18 }}>Escolha uma identidade para deixar o Pediu com a sua cara e compartilhar com quem você gosta.</Text>
    </View>
    <Card><ThemePicker /></Card>
    <Card>
      <Row icon="language" title="Idioma" subtitle="Português (Brasil)" />
      <Row icon="notifications" title="Notificações" onPress={() => router.push("/account/notifications")} />
      <Row icon="security" title="Segurança" subtitle="Sessão e autenticação" />
    </Card>
    <Card><Row icon="tune" title="Configurações avançadas" subtitle="Privacidade, dados, diagnóstico e ambiente" onPress={() => router.push("/account/settings/advanced")} /></Card>
    <Text style={s.muted}>Versão do aplicativo: MVP · Pediu</Text>
  </Page>;
}
