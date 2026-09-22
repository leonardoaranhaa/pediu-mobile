import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Page, Card, Row, s } from "@/components/pediu-page";
import { APP_THEMES, useAppPreferences } from "@/lib/app-preferences";

function ThemeOption({ theme, selected, onPress }: { theme: (typeof APP_THEMES)[number]; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: selected ? theme.primary : theme.line, backgroundColor: theme.canvas, gap: 11 }, pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] }]}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.ink, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.highlight, fontSize: 16, fontWeight: "900" }}>p</Text></View>
      </View>
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.ink, fontSize: 14, fontWeight: "900" }}>{theme.label}</Text><Text style={{ color: theme.muted, fontSize: 11 }}>{theme.tagline}</Text></View>
      <View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: selected ? theme.primary : theme.line, alignItems: "center", justifyContent: "center" }}>{selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.primary }} /> : null}</View>
    </View>
    <View style={{ flexDirection: "row", gap: 7 }}><View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: theme.primary }} /><View style={{ width: 42, height: 9, borderRadius: 5, backgroundColor: theme.highlight }} /><View style={{ width: 28, height: 9, borderRadius: 5, backgroundColor: theme.ink }} /></View>
  </Pressable>;
}

export default function SettingsPage() {
  const { themeId, setTheme } = useAppPreferences();
  return <Page title="Configurações" eyebrow="PREFERÊNCIAS">
    <View style={{ backgroundColor: themeId === "classic" ? "#163B48" : themeId === "ocean" ? "#073B4C" : "#44213B", borderRadius: 26, padding: 19, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialIcons name="auto-awesome" size={18} color="#FFD166" /><Text style={{ color: "#FFD166", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }}>O PEDIU É SEU</Text></View>
      <Text style={{ color: "#FFFFFF", fontSize: 22, lineHeight: 27, fontWeight: "900", letterSpacing: -0.5 }}>O app de delivery de sempre, só que do seu jeito.</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12, lineHeight: 18 }}>Escolha uma identidade para deixar o Pediu com a sua cara e compartilhar com quem você gosta.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>Personalize sua experiência</Text>
      <Text style={s.muted}>A escolha fica salva neste dispositivo e pode ser alterada quando quiser.</Text>
      <View style={{ gap: 10 }}>{APP_THEMES.map((theme) => <ThemeOption key={theme.id} theme={theme} selected={theme.id === themeId} onPress={() => setTheme(theme.id)} />)}</View>
    </Card>
    <Card>
      <Row icon="language" title="Idioma" subtitle="Português (Brasil)" />
      <Row icon="notifications" title="Notificações" onPress={() => router.push("/account/notifications")} />
      <Row icon="security" title="Segurança" subtitle="Sessão e autenticação" />
    </Card>
    <Card><Row icon="tune" title="Configurações avançadas" subtitle="Privacidade, dados, diagnóstico e ambiente" onPress={() => router.push("/account/settings/advanced")} /></Card>
    <Text style={s.muted}>Versão do aplicativo: MVP · Pediu</Text>
  </Page>;
}
