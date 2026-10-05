import { ActivityIndicator, Text } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const query = trpc.admin.payments.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });

  if (loading) return <Page title="Pagamentos" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="Pagamentos exige papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Pagamentos" eyebrow="MASTER MANAGEMENT">
      <Card>
        <Text style={s.sectionTitle}>Cobranças</Text>
        <Text style={s.muted}>PIX e demais métodos via routers existentes. Reembolso completo fica para política futura.</Text>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar pagamentos.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="payments" title="Nenhuma cobrança" body="Pedidos com pagamento geram registros aqui." />
      ) : null}
      {query.data?.map((payment) => (
        <Row
          key={payment.id}
          icon={payment.status === "failed" ? "error-outline" : "payments"}
          title={`#${payment.id} · ${statusLabel[payment.status] ?? payment.status}`}
          subtitle={`Pedido #${payment.orderId} · ${payment.method.toUpperCase()}${payment.transactionId ? ` · ${payment.transactionId}` : ""}`}
        />
      ))}
    </Page>
  );
}
