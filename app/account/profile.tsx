import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Page, Card, Row, OutlineButton, PEDIU, s } from "@/components/pediu-page";

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  return <Page title="Perfil" eyebrow="SUA CONTA">
    <View style={{ backgroundColor: PEDIU.ink, borderRadius: 24, padding: 20, alignItems: "center", gap: 6 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: PEDIU.yellow, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <Text style={{ fontSize: 25, fontWeight: "900", color: PEDIU.ink }}>{(user?.name ?? "A").slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={{ color: PEDIU.white, fontSize: 18, fontWeight: "800" }}>{user?.name ?? "Sua conta"}</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12 }}>{user?.email ?? "Entre para sincronizar seus dados"}</Text>
    </View>
    <Card>
      <Row icon="person" title="Dados pessoais" subtitle="Nome e informações da conta" />
      <Row icon="location-on" title="Meus endereços" onPress={() => router.push("/account/addresses")} />
      <Row icon="credit-card" title="Pagamentos" onPress={() => router.push("/account/payment-methods")} />
      <Row icon="notifications" title="Notificações" onPress={() => router.push("/account/notifications")} />
      <Row icon="settings" title="Configurações" onPress={() => router.push("/account/settings")} />
    </Card>
    {user?.role === "admin" ? <OutlineButton title="Painel administrativo" onPress={() => router.push("/admin")} /> : null}
    {isAuthenticated ? <OutlineButton title="Sair da conta" onPress={() => void logout()} /> : null}
    <Text style={s.muted}>O modo vendedor aparece apenas quando a conta possui perfil de estabelecimento.</Text>
  </Page>;
}
