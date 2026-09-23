import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, PrimaryButton, Row, PEDIU, s } from "@/components/pediu-page";

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const q = trpc.pediu.orders.mine.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5_000 });

  return (
    <Page title="Meus pedidos" eyebrow="HISTÓRICO">
      <View style={{ backgroundColor: PEDIU.ink, borderRadius: 26, padding: 19, gap: 8, overflow: "hidden" }}>
        <MaterialIcons name="local-mall" size={24} color={PEDIU.yellow} />
        <Text style={{ color: PEDIU.white, fontSize: 21, fontWeight: "900", letterSpacing: -0.5 }}>Tudo que você pediu, em um só lugar.</Text>
        <Text style={{ color: "#BCD0D1", fontSize: 12, lineHeight: 18 }}>Acompanhe cada etapa e volte a pedir seus favoritos quando quiser.</Text>
      </View>
      {!isAuthenticated ? (
        <Card><Text style={s.sectionTitle}>Sincronize seu histórico</Text><Text style={s.muted}>Entre para consultar seus pedidos sincronizados em qualquer dispositivo.</Text><PrimaryButton title="Entrar com login seguro" onPress={() => router.push("/login")} /></Card>
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
