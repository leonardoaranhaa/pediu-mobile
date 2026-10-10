import { router } from "expo-router";
import { Text } from "react-native";
import {
  Card,
  OutlineButton,
  Page,
  Row,
  ToggleRow,
  s,
} from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";

export default function AdvancedSettingsPage() {
  const { theme, customization, updateCustomization, resetCustomization } =
    useAppPreferences();

  return (
    <Page title="Configurações avançadas" eyebrow="CONTROLE">
      <Card>
        <ToggleRow
          icon="auto-awesome"
          title="Casa inteligente"
          subtitle="Organizar Mercado, padaria e Flash pelo horário local."
          value={customization.smartHomeEnabled}
          onChange={(value) => updateCustomization({ smartHomeEnabled: value })}
        />
        <ToggleRow
          icon="animation"
          title="Movimento suave"
          subtitle="Entradas e reações animadas sem exagero."
          value={customization.motionEnabled}
          onChange={(value) => updateCustomization({ motionEnabled: value })}
        />
        <ToggleRow
          icon="auto-awesome"
          title="Mascote do Pediu"
          subtitle="Uma carinha que acompanha suas escolhas."
          value={customization.mascotEnabled}
          onChange={(value) => updateCustomization({ mascotEnabled: value })}
        />
        <ToggleRow
          icon="lightbulb"
          title="Dicas contextuais"
          subtitle="Lembretes discretos para aproveitar melhor o app."
          value={customization.showHints}
          onChange={(value) => updateCustomization({ showHints: value })}
        />
      </Card>
      <Card>
        <Text style={{ fontSize: 14, fontWeight: "900", color: theme.ink }}>
          Privacidade e funcionamento
        </Text>
        <ToggleRow
          icon="analytics"
          title="Dados de uso"
          subtitle="Permitir métricas anônimas para melhorar o app."
          value={customization.analyticsEnabled}
          onChange={(value) => updateCustomization({ analyticsEnabled: value })}
        />
        <ToggleRow
          icon="location-on"
          title="Localização"
          subtitle="Usar GPS quando você pedir endereço e entrega."
          value={customization.locationEnabled}
          onChange={(value) => updateCustomization({ locationEnabled: value })}
        />
        <ToggleRow
          icon="bug-report"
          title="Diagnóstico"
          subtitle="Permitir registros técnicos quando houver erro."
          value={customization.diagnosticsEnabled}
          onChange={(value) =>
            updateCustomization({ diagnosticsEnabled: value })
          }
        />
        <Row
          icon="security"
          title="Segurança e privacidade"
          subtitle="Consentimentos e controles da sua conta"
          onPress={() => router.push("/account/privacy")}
        />
        <Text style={s.muted}>
          Os controles acima são persistidos por usuário quando você está
          conectado e separados para visitantes.
        </Text>
      </Card>
      <Card>
        <Text style={{ fontSize: 14, fontWeight: "900", color: theme.ink }}>
          Restaurar preferências
        </Text>
        <Text style={s.muted}>
          Volta o tema, o mascote, o movimento e os consentimentos locais para
          os padrões do Pediu.
        </Text>
        <OutlineButton
          title="Restaurar preferências locais"
          onPress={resetCustomization}
        />
      </Card>
    </Page>
  );
}
