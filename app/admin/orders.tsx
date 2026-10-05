import { ActivityIndicator, Text } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const query = trpc.admin.orders.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });

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
        <Text style={s.sectionTitle}>Fila recente</Text>
        <Text style={s.muted}>Contrato admin.orders — status, Flash e totais do servidor.</Text>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar pedidos.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="receipt-long" title="Nenhum pedido ainda" body="Quando clientes finalizarem checkout, a fila aparece aqui." />
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
