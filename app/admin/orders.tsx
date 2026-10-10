import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

const STATUS_FILTERS = [
  { label: "Todos", value: undefined },
  { label: "Pendente", value: "Pendente" as const },
  { label: "A caminho", value: "A caminho" as const },
  { label: "Entregue", value: "Entregue" as const },
  { label: "Cancelado", value: "Cancelado" as const },
];

type OrderStatus = "Pendente" | "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | "Cancelado";

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [flashOnly, setFlashOnly] = useState(false);
  const query = trpc.admin.orders.useQuery(
    { limit: 50, offset: 0, status, flash: flashOnly ? true : undefined },
    { enabled: allowed },
  );
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: allowed, staleTime: 15_000 });

  if (loading) return <Page title="Pedidos" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="A fila de pedidos exige papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Pedidos" eyebrow="MASTER MANAGEMENT">
      <Card>
        <Text style={s.sectionTitle}>Fila operacional</Text>
        <Text style={s.muted}>
          {overview.data
            ? `${overview.data.pendingOrders} pendentes · ${overview.data.flashOrdersToday} Flash hoje`
            : "Filtros por status e Flash — totais do servidor."}
        </Text>
        <View style={styles.chips}>
          {STATUS_FILTERS.map((item) => {
            const on = status === item.value;
            return (
              <Pressable key={item.label} onPress={() => setStatus(item.value)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setFlashOnly((value) => !value)} style={[styles.chip, flashOnly && styles.chipFlash]}>
            <Text style={[styles.chipText, flashOnly && styles.chipTextOn]}>Só Flash</Text>
          </Pressable>
        </View>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar pedidos.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="receipt-long" title="Nenhum pedido neste filtro" body="Ajuste status/Flash ou aguarde novos checkouts." />
      ) : null}
      {query.data?.map((order) => (
        <Row
          key={order.id}
          icon={order.isFlash ? "bolt" : "receipt-long"}
          title={`#${order.id} · ${order.status}${order.isFlash ? " · Flash" : ""}`}
          subtitle={`Loja #${order.storeId} · cliente #${order.customerId} · R$ ${Number(order.total).toFixed(2).replace(".", ",")}${Number(order.tipAmount) > 0 ? ` · gorjeta R$ ${Number(order.tipAmount).toFixed(2).replace(".", ",")}` : ""}`}
        />
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
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
  chipOn: { backgroundColor: PEDIU_TOKENS.ink, borderColor: PEDIU_TOKENS.ink },
  chipFlash: { backgroundColor: PEDIU_TOKENS.primary, borderColor: PEDIU_TOKENS.primary },
  chipText: { color: PEDIU_TOKENS.muted, fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: PEDIU_TOKENS.white },
});
