import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { router } from "expo-router";

const PERKS = [
  { title: "Pontos em todo pedido", body: "R$ 1 vira 1 ponto. No Prata, 1,2×." },
  { title: "Flash na frente", body: "Pedidos Flash elegíveis ganham prioridade na moto." },
  { title: "Cupom de aniversário", body: "FOME20 no mês do seu Pediu." },
  { title: "Mercado relâmpago", body: "Taxa menor no Mercado depois das 22h." },
];

export default function ClubScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <Page title="Clube Pediu" eyebrow="FIDELIDADE">
      <View style={styles.hero}>
        <Text style={styles.kicker}>
          <MaterialIcons name="bolt" size={14} color={PEDIU_TOKENS.accent} /> Clube Pediu · Bronze
        </Text>
        <Text style={styles.points}>0</Text>
        <Text style={styles.pointsLabel}>pontos · saldo local até o ledger de loyalty</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: "8%" }]} />
        </View>
        <Text style={styles.progressHint}>Faltam pontos para o Prata — domínio na Fase 3c</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>Pedidos</Text>
          <Text style={styles.statValue}>—</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>Já pediu</Text>
          <Text style={styles.statValue}>R$ —</Text>
        </Card>
      </View>

      <Text style={s.sectionTitle}>Vantagens</Text>
      {PERKS.map((perk) => (
        <Card key={perk.title}>
          <Text style={s.rowTitle}>{perk.title}</Text>
          <Text style={s.muted}>{perk.body}</Text>
        </Card>
      ))}

      {!isAuthenticated ? (
        <EmptyState
          icon="workspace-premium"
          title="Entre para acumular pontos"
          body="O Clube usa sua conta Pediu. Resgate e tiers entram com o ledger de loyalty — sem checkout fake."
          actionLabel="Ir ao perfil"
          onAction={() => router.replace("/")}
        />
      ) : (
        <PrimaryButton title="Ver Mercado Flash" onPress={() => router.push("/market")} />
      )}

      <Text style={[s.muted, { textAlign: "center" }]}>
        Resgate e crédito de pontos só após API `loyalty_*` (ver roadmap de domínio). Cor de destaque: {PEDIU.coral}.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  kicker: { color: PEDIU_TOKENS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  points: { color: PEDIU_TOKENS.white, fontSize: 48, fontWeight: "900", letterSpacing: -1.5, marginTop: 4 },
  pointsLabel: { color: "rgba(255,244,232,0.65)", fontSize: 13 },
  track: { height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", marginTop: 8 },
  fill: { height: 8, backgroundColor: PEDIU_TOKENS.accent, borderRadius: 999 },
  progressHint: { color: "rgba(255,244,232,0.55)", fontSize: 11, marginTop: 4 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1 },
  statLabel: { color: PEDIU_TOKENS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  statValue: { color: PEDIU_TOKENS.ink, fontSize: 22, fontWeight: "900", marginTop: 4 },
});
