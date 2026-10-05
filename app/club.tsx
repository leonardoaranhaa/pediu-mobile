import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";

const PERKS = [
  { title: "Pontos em todo pedido", body: "R$ 1 vira 1 ponto após entrega. No Prata, 1,2×." },
  { title: "Flash na frente", body: "Pedidos Flash elegíveis ganham prioridade na moto." },
  { title: "Resgate em cupom", body: "100 pts → R$ 5 de crédito em cupom interno do servidor." },
  { title: "Mercado relâmpago", body: "Vertical Mercado com SLA próprio no schema." },
];

export default function ClubScreen() {
  const { isAuthenticated } = useAuth();
  const loyalty = trpc.pediu.loyalty.me.useQuery(undefined, { enabled: isAuthenticated, staleTime: 20_000 });
  const redeem = trpc.pediu.loyalty.redeem.useMutation({
    onSuccess: async () => {
      await loyalty.refetch();
    },
  });

  const points = loyalty.data?.points ?? 0;
  const tierLabel = loyalty.data?.tierLabel ?? "Bronze";
  const progress = Math.round((loyalty.data?.progress ?? 0) * 100);
  const nextHint = loyalty.data?.nextTierLabel
    ? `Faltam ${loyalty.data.pointsToNextTier} pts para ${loyalty.data.nextTierLabel}`
    : "Você está no topo do Clube";

  return (
    <Page title="Clube Pediu" eyebrow="FIDELIDADE">
      <View style={styles.hero}>
        <Text style={styles.kicker}>
          <MaterialIcons name="bolt" size={14} color={PEDIU_TOKENS.accent} /> Clube Pediu · {tierLabel}
        </Text>
        <Text style={styles.points}>{isAuthenticated ? points : "—"}</Text>
        <Text style={styles.pointsLabel}>
          {isAuthenticated ? "pontos · saldo no ledger de loyalty" : "entre para ver seu saldo real"}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${isAuthenticated ? Math.max(8, progress) : 8}%` }]} />
        </View>
        <Text style={styles.progressHint}>{isAuthenticated ? nextHint : "Domínio loyalty_* no servidor"}</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>Lifetime</Text>
          <Text style={styles.statValue}>{loyalty.data?.lifetimePoints ?? "—"}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>Resgate</Text>
          <Text style={styles.statValue}>100→R$5</Text>
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
          body="O Clube usa sua conta Pediu. Pontos só creditam após entrega confirmada no servidor."
          actionLabel="Ir ao perfil"
          onAction={() => router.replace("/")}
        />
      ) : (
        <>
          <PrimaryButton
            title={redeem.isPending ? "Resgatando…" : "Resgatar 100 pts (R$ 5)"}
            disabled={redeem.isPending || points < 100}
            onPress={() =>
              redeem.mutate({
                blocks: 1,
                idempotencyKey: `redeem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              })
            }
          />
          {redeem.data?.couponCode ? (
            <Card>
              <Text style={s.rowTitle}>Cupom gerado</Text>
              <Text style={s.muted}>Use {redeem.data.couponCode} no checkout · R$ {redeem.data.creditAmount}</Text>
            </Card>
          ) : null}
          {redeem.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{redeem.error.message}</Text> : null}
          <PrimaryButton title="Ver Mercado Flash" onPress={() => router.push("/market")} />
        </>
      )}
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
