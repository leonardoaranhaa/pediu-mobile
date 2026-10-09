import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Card, Page, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";
import { useAppPreferences } from "@/lib/app-preferences";

export default function SettingsPage() {
  const { theme, customization } = useAppPreferences();

  return (
    <Page title="Configurações" eyebrow="PREFERÊNCIAS">
      <View
        style={{
          backgroundColor: theme.ink,
          borderRadius: 26,
          padding: 19,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialIcons
            name="auto-awesome"
            size={18}
            color={theme.highlight}
          />
          <Text
            style={{
              color: theme.highlight,
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 1.1,
            }}
          >
            O PEDIU É SEU
          </Text>
        </View>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 22,
            lineHeight: 27,
            fontWeight: "900",
            letterSpacing: -0.5,
          }}
        >
          O app de delivery de sempre, só que do seu jeito.
        </Text>
        <Text style={{ color: "#BCD0D1", fontSize: 12, lineHeight: 18 }}>
          Escolha uma identidade e deixe o Pediu entender melhor o seu momento.
        </Text>
      </View>
      <Card>
        <ThemePicker />
      </Card>
      <Card>
        <Row
          icon="tune"
          title="Casa inteligente e mascote"
          subtitle={`${customization.smartHomeEnabled ? "Horário inteligente" : "Casa neutra"} · ${customization.mascotEnabled ? "mascote ativo" : "mascote discreto"}`}
          onPress={() => router.push("/account/settings/advanced")}
        />
        <Row
          icon="notifications"
          title="Notificações"
          subtitle="Avisos de pedidos e novidades"
          onPress={() => router.push("/account/notifications")}
        />
        <Row
          icon="location-on"
          title="Endereços e localização"
          subtitle="Casa, trabalho e endereço automático"
          onPress={() => router.push("/account/addresses")}
        />
        <Row
          icon="account-balance-wallet"
          title="Pagamento e Pediu Pay"
          subtitle="Métodos disponíveis e carteira"
          onPress={() => router.push("/account/payment-methods")}
        />
        <Row
          icon="security"
          title="Segurança e privacidade"
          subtitle="Sessão, consentimentos e LGPD"
          onPress={() => router.push("/account/privacy")}
        />
      </Card>
      <Card>
        <Row
          icon="help-outline"
          title="Ajuda e assistente"
          subtitle="Tire dúvidas com o suporte do Pediu"
          onPress={() => router.push("/account/support-chat")}
        />
      </Card>
      <Text style={s.muted}>Versão do aplicativo: MVP · Pediu</Text>
    </Page>
  );
}
