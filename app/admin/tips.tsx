import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

const DEST_LABEL: Record<string, string> = {
  courier: "Entregador",
  store: "Loja",
  platform_pool: "Pool plataforma",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  settled: "Liquidada",
  reversed: "Estornada",
};

type TipStatus = "pending" | "settled" | "reversed";
type TipDestination = "courier" | "store" | "platform_pool";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminTipsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const [status, setStatus] = useState<TipStatus | undefined>(undefined);
  const [destination, setDestination] = useState<TipDestination | undefined>(
    undefined,
  );

  const query = trpc.admin.tips.useQuery(
    { limit: 50, offset: 0, status, destination },
    { enabled: allowed },
  );
  const overview = trpc.admin.overview.useQuery(undefined, {
    enabled: allowed,
    staleTime: 15_000,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const settledSum = useMemo(() => {
    return rows
      .filter((row) => row.status === "settled")
      .reduce((sum, row) => sum + Number(row.amount), 0);
  }, [rows]);

  if (loading) {
    return (
      <Page title="Gorjetas" eyebrow="OPS">
        <ActivityIndicator color={PEDIU.coral} />
      </Page>
    );
  }

  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState
          icon="lock-outline"
          title="Somente administradores"
          body="Liquidação de gorjetas exige papel admin."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Page>
    );
  }

  return (
    <Page title="Gorjetas" eyebrow="MASTER MANAGEMENT">
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>TIP OPS</Text>
        <Text style={styles.heroTitle}>Settlements de gorjeta</Text>
        <Text style={styles.heroBody}>
          Visibilidade contábil pós-entrega. Payout via provider fica para a
          próxima onda.
        </Text>
      </View>

      {overview.data ? (
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{overview.data.tipsSettled}</Text>
            <Text style={styles.metricLabel}>Liquidadas</Text>
          </View>
          <View style={[styles.metric, styles.metricAccent]}>
            <Text
              style={[styles.metricValue, { color: PEDIU_TOKENS.accentFg }]}
            >
              R${" "}
              {Number(overview.data.tipsSettledAmount)
                .toFixed(2)
                .replace(".", ",")}
            </Text>
            <Text style={styles.metricLabel}>Volume liquidado</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: PEDIU_TOKENS.primary }]}>
              {overview.data.tipsPending}
            </Text>
            <Text style={styles.metricLabel}>Pendentes</Text>
          </View>
        </View>
      ) : null}

      <Card>
        <Text style={s.sectionTitle}>Filtros</Text>
        <Text style={s.label}>STATUS</Text>
        <View style={styles.chips}>
          <Chip
            label="Todos"
            active={status === undefined}
            onPress={() => setStatus(undefined)}
          />
          <Chip
            label="Liquidada"
            active={status === "settled"}
            onPress={() => setStatus("settled")}
          />
          <Chip
            label="Pendente"
            active={status === "pending"}
            onPress={() => setStatus("pending")}
          />
          <Chip
            label="Estornada"
            active={status === "reversed"}
            onPress={() => setStatus("reversed")}
          />
        </View>
        <Text style={s.label}>DESTINO</Text>
        <View style={styles.chips}>
          <Chip
            label="Todos"
            active={destination === undefined}
            onPress={() => setDestination(undefined)}
          />
          <Chip
            label="Entregador"
            active={destination === "courier"}
            onPress={() => setDestination("courier")}
          />
          <Chip
            label="Loja"
            active={destination === "store"}
            onPress={() => setDestination("store")}
          />
          <Chip
            label="Pool"
            active={destination === "platform_pool"}
            onPress={() => setDestination("platform_pool")}
          />
        </View>
        {rows.length ? (
          <Text style={s.muted}>
            Nesta página: {rows.length} registro(s) · liquidadas R${" "}
            {settledSum.toFixed(2).replace(".", ",")}
          </Text>
        ) : null}
      </Card>

      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? (
        <EmptyState
          icon="cloud-off"
          title="Não foi possível carregar gorjetas"
          body="Verifique a sessão admin e tente de novo."
          actionLabel="Recarregar"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.error && !rows.length ? (
        <EmptyState
          icon="savings"
          title="Nenhuma gorjeta liquidada ainda"
          body="Quando um pedido com tip for marcado como Entregue, o settlement aparece aqui."
        />
      ) : null}

      {rows.map((tip) => (
        <Row
          key={tip.id}
          icon={
            tip.destination === "courier"
              ? "two-wheeler"
              : tip.destination === "store"
                ? "storefront"
                : "account-balance"
          }
          title={`#${tip.id} · ${STATUS_LABEL[tip.status] ?? tip.status} · R$ ${Number(tip.amount).toFixed(2).replace(".", ",")}`}
          subtitle={`Pedido #${tip.orderId} · loja #${tip.storeId} · ${DEST_LABEL[tip.destination] ?? tip.destination}${tip.recipientUserId ? ` · user #${tip.recipientUserId}` : " · sem destinatário"}${tip.note ? ` · ${tip.note}` : ""}`}
        />
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  heroEyebrow: {
    color: PEDIU_TOKENS.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: PEDIU_TOKENS.white,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroBody: {
    color: "rgba(255,244,232,0.72)",
    fontSize: 12,
    lineHeight: 18,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    backgroundColor: PEDIU_TOKENS.surface,
    gap: 4,
  },
  metricAccent: { backgroundColor: "#FFF3C4" },
  metricValue: {
    color: PEDIU_TOKENS.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  metricLabel: { color: PEDIU_TOKENS.muted, fontSize: 11, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    backgroundColor: PEDIU_TOKENS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderColor: PEDIU_TOKENS.ink,
  },
  chipText: { color: PEDIU_TOKENS.muted, fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: PEDIU_TOKENS.white },
});
