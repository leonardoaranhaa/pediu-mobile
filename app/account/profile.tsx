import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Page, Card, Row, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, customization } = useAppPreferences();
  return <Page title="Perfil" eyebrow="SUA CONTA">
    <View style={{ backgroundColor: theme.ink, borderRadius: 28, padding: 21, alignItems: "center", gap: 6, shadowColor: theme.ink, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.highlight, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <Text style={{ fontSize: 25, fontWeight: "900", color: theme.highlightText }}>{(user?.name ?? "A").slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={{ color: PEDIU.white, fontSize: 18, fontWeight: "800" }}>{user?.name ?? "Sua conta"}</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12 }}>{user?.email ?? "Entre para sincronizar seus dados"}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.12)" }}><MaterialIcons name="verified-user" size={13} color={PEDIU.yellow} /><Text style={{ color: PEDIU.white, fontSize: 10, fontWeight: "800" }}>{isAuthenticated ? "Conta sincronizada" : "Modo visitante"}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.12)" }}><MaterialIcons name="favorite" size={13} color={PEDIU.coral} /><Text style={{ color: PEDIU.white, fontSize: 10, fontWeight: "800" }}>Pediu local</Text></View></View>
    </View>
    <Card>
      <Text style={s.label}>ACESSOS RÁPIDOS</Text>
      <Row icon="person" title="Dados pessoais" subtitle="Nome e informações da conta" onPress={() => router.push("/account/personal")} />
      <Row icon="location-on" title="Meus endereços" onPress={() => router.push("/account/addresses")} />
      <Row icon="credit-card" title="Pagamentos" onPress={() => router.push("/account/payment-methods")} />
      <Row icon="notifications" title="Notificações" onPress={() => router.push("/account/notifications")} />
      <Row icon="settings" title="Personalizar o Pediu" subtitle={`${theme.label} · mascote ${customization.mascotEnabled ? "ativo" : "discreto"}`} onPress={() => router.push("/account/settings")} />
    </Card>
    {user?.role === "admin" ? <OutlineButton title="Painel administrativo" onPress={() => router.push("/admin")} /> : null}
    {isAuthenticated ? <OutlineButton title="Sair da conta" onPress={() => void logout()} /> : null}
    <Text style={s.muted}>O modo vendedor aparece apenas quando a conta possui perfil de estabelecimento.</Text>
  </Page>;
}
