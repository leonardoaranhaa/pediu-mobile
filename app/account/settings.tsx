import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Card, Page, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";
import { ACCOUNT_PREFERENCE_SECTIONS } from "@/lib/account-preferences";
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
          Escolha uma identidade, ajuste seus avisos e deixe o Pediu entender
          melhor o seu momento.
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.highlight,
            }}
          />
          <Text style={{ color: "#E8F2F1", fontSize: 11, fontWeight: "800" }}>
            {theme.label} · {customization.mascotEnabled ? "mascote ativo" : "modo discreto"}
          </Text>
        </View>
      </View>

      <Card>
        <ThemePicker />
      </Card>

      <Card>
        <Text style={s.label}>IDENTIDADE DO APLICATIVO</Text>
        <Row
          icon="language"
          title="Idioma"
          subtitle="Português (Brasil)"
          right={
            <Text style={[s.muted, { color: theme.primary, fontWeight: "900" }]}>
              PT-BR
            </Text>
          }
        />
      </Card>

      {ACCOUNT_PREFERENCE_SECTIONS.map((section) => (
        <Card key={section.key}>
          <Text style={[s.label, { color: theme.muted }]}>{section.label}</Text>
          {section.links.map((link) => (
            <Row
              key={link.key}
              icon={link.icon}
              title={link.title}
              subtitle={link.subtitle}
              onPress={() => router.push(link.path as never)}
            />
          ))}
        </Card>
      ))}

      <Text style={s.muted}>
        Temas, mascote e preferências de experiência ficam separados por conta
        quando você está conectado; no modo visitante, ficam apenas neste
        dispositivo.
      </Text>
      <Text style={s.muted}>Versão do aplicativo: MVP · Pediu</Text>
    </Page>
  );
}
