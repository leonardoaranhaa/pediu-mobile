import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, Row, s } from "@/components/pediu-page";

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const q = trpc.pediu.orders.mine.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5_000 });

  return (
    <Page title="Meus pedidos" eyebrow="HISTÓRICO">
      {!isAuthenticated ? (
        <Card><Text style={s.muted}>Entre para consultar seus pedidos sincronizados.</Text></Card>
      ) : q.isLoading ? (
        <Card><Text style={s.muted}>Carregando pedidos...</Text></Card>
      ) : q.isError ? (
        <Card><Text style={s.sectionTitle}>Não foi possível carregar</Text><Text style={s.muted}>{q.error.message}</Text></Card>
      ) : q.data?.length ? (
        <Card>
          {q.data.map((order) => (
            <Row
              key={order.id}
              icon="receipt-long"
              title={`Pedido #${order.id} · R$ ${Number(order.total).toFixed(2).replace(".", ",")}`}
              subtitle={`${order.status} · ${order.deliveryAddress ?? "Endereço não informado"}`}
              onPress={() => router.push({ pathname: "/order/track", params: { orderId: String(order.id) } })}
            />
          ))}
        </Card>
      ) : (
        <Card><Text style={s.muted}>Você ainda não fez pedidos.</Text></Card>
      )}
    </Page>
  );
}
