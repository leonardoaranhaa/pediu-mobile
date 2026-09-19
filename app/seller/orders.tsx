import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, PrimaryButton, OutlineButton, s, PEDIU } from "@/components/pediu-page";

const nextStatus: Record<string, "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | undefined> = {
  Pendente: "Aceito",
  Aceito: "Preparando",
  Preparando: "Pronto",
  Pronto: "A caminho",
  "A caminho": "Entregue",
};

const actionLabel: Record<string, string> = {
  Pendente: "Aceitar pedido",
  Aceito: "Iniciar preparo",
  Preparando: "Marcar como pronto",
  Pronto: "Enviar para entrega",
  "A caminho": "Confirmar entrega",
};

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const q = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: user?.role === "merchant",
    refetchInterval: 10_000,
  });
  const updateStatus = trpc.pediu.orders.status.useMutation({
    onSuccess: () => void q.refetch(),
  });

  const advance = (orderId: number, status: NonNullable<typeof nextStatus[string]>) => {
    updateStatus.mutate({ orderId, status });
  };

  const cancel = (orderId: number) => {
    updateStatus.mutate({ orderId, status: "Cancelado" });
  };

  return (
    <Page title="Pedidos" eyebrow="OPERAÇÃO">
      {q.isLoading ? (
        <Card><Text style={s.muted}>Carregando pedidos...</Text></Card>
      ) : q.isError ? (
        <Card><Text style={s.sectionTitle}>Não foi possível carregar</Text><Text style={s.muted}>{q.error.message}</Text></Card>
      ) : q.data?.length ? (
        q.data.map((order) => {
          const next = nextStatus[order.status];
          const canCancel = order.status === "Pendente";
          return (
            <Card key={order.id}>
              <View style={{ gap: 4 }}>
                <Text style={s.sectionTitle}>Pedido #{order.id}</Text>
                <Text style={{ color: PEDIU.coral, fontSize: 13, fontWeight: "900" }}>{order.status}</Text>
                <Text style={s.muted}>R$ {Number(order.total).toFixed(2).replace(".", ",")} · {order.deliveryAddress ?? "Sem endereço"}</Text>
              </View>
              {next ? (
                <PrimaryButton
                  title={actionLabel[order.status] ?? "Atualizar pedido"}
                  disabled={updateStatus.isPending}
                  onPress={() => advance(order.id, next)}
                />
              ) : null}
              {canCancel ? <OutlineButton title="Recusar pedido" onPress={() => cancel(order.id)} /> : null}
              <OutlineButton title="Ver acompanhamento" onPress={() => router.push({ pathname: "/order/track", params: { orderId: String(order.id) } })} />
              {updateStatus.isError ? <Text style={s.muted}>{updateStatus.error.message}</Text> : null}
            </Card>
          );
        })
      ) : (
        <Card><Text style={s.muted}>Nenhum pedido recebido ainda.</Text></Card>
      )}
    </Page>
  );
}
