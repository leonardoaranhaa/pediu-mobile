import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

function Metric({ label, value, tone = "ink" }: { label: string; value: number | string; tone?: "ink" | "primary" | "accent" }) {
  const bg = tone === "primary" ? PEDIU_TOKENS.primarySoft : tone === "accent" ? "#FFF3C4" : PEDIU_TOKENS.surface;
  const fg = tone === "primary" ? PEDIU_TOKENS.primary : tone === "accent" ? PEDIU_TOKENS.accentFg : PEDIU_TOKENS.ink;
  return (
    <View style={[styles.metric, { backgroundColor: bg }]}>
      <Text style={[styles.metricValue, { color: fg }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isAdmin, staleTime: 15_000 });

  if (authLoading) {
    return <View style={s.root}><ActivityIndicator style={{ flex: 1 }} color={PEDIU.coral} /></View>;
  }

  if (!isAdmin) {
    return (
      <Page title="Acesso restrito" eyebrow="MASTER MANAGEMENT">
        <EmptyState
          icon="lock-outline"
          title="Área exclusiva para administradores"
          body="Sua conta não possui permissão para o console operacional Pediu."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Page>
    );
  }

  const data = overview.data;

  return (
    <Page title="Master management" eyebrow="PEDIU · OPS" back={false}>
      <View style={styles.hero}>
        <MaterialIcons name="dashboard" size={22} color={PEDIU_TOKENS.accent} />
        <Text style={styles.heroTitle}>Console operacional</Text>
        <Text style={styles.heroBody}>
          Mesmo backend tRPC do app. Filas do dia, lojas Flash e ações ops — sem segundo servidor.
        </Text>
      </View>

      {overview.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {overview.error ? (
        <EmptyState
          icon="cloud-off"
          title="Não foi possível carregar o overview"
          body="Verifique a sessão admin e tente de novo."
          actionLabel="Recarregar"
          onAction={() => void overview.refetch()}
        />
      ) : null}

      {data ? (
        <View style={styles.metrics}>
          <Metric label="Pedidos pendentes" value={data.pendingOrders} tone="primary" />
          <Metric label="Pagamentos pendentes" value={data.pendingPayments} tone="accent" />
          <Metric label="Pagamentos falhos" value={data.failedPayments} tone="primary" />
          <Metric label="Chamados abertos" value={data.openSupportTickets} />
          <Metric label="Lojas abertas" value={data.openStores} />
          <Metric label="Lojas Flash" value={data.flashStores} tone="accent" />
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Operação</Text>
      <Row icon="people-outline" title="Usuários" subtitle={data ? `${data.users} contas` : "Papéis e acesso"} onPress={() => router.push("/admin/users")} />
      <Row icon="storefront" title="Estabelecimentos" subtitle={data ? `${data.stores} lojas · ${data.flashStores} Flash` : "Flash, vertical e abertura"} onPress={() => router.push("/admin/stores")} />
      <Row icon="receipt-long" title="Pedidos" subtitle={data ? `${data.pendingOrders} na fila` : "Fila recente"} onPress={() => router.push("/admin/orders")} />
      <Row icon="payments" title="Pagamentos" subtitle={data ? `${data.pendingPayments} pendentes · ${data.failedPayments} falhos` : "Cobranças e falhas"} onPress={() => router.push("/admin/payments")} />
      <Row icon="account-balance-wallet" title="Crédito / Fiado" subtitle={data ? `${data.creditAccounts} contas` : "Contas lojista"} onPress={() => router.push("/admin/credit")} />
      <Row icon="support-agent" title="Suporte" subtitle={data ? `${data.openSupportTickets} abertos` : "Chamados e respostas"} onPress={() => router.push("/admin/support")} />
      <Row icon="security" title="Auditoria" subtitle="Trilha de ações administrativas" onPress={() => router.push("/admin/audit")} />

      <Card>
        <Text style={s.sectionTitle}>Domínio em evolução</Text>
        <Text style={s.muted}>Flash e Club/pontos já no schema e nas APIs. Mercado/Sabor com filtros. Pediu Junto ainda desligado nas flags.</Text>
        <Pressable onPress={() => router.push("/flash")} style={styles.linkChip}>
          <Text style={styles.linkChipText}>Ver Flash no app</Text>
        </Pressable>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  heroTitle: { color: PEDIU_TOKENS.white, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  heroBody: { color: "rgba(255,244,232,0.72)", fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    gap: 4,
  },
  metricValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.8 },
  metricLabel: { color: PEDIU_TOKENS.muted, fontSize: 11, fontWeight: "700" },
  linkChip: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: PEDIU_TOKENS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkChipText: { color: PEDIU_TOKENS.primary, fontWeight: "800", fontSize: 12 },
});
