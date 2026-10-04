import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, PrimaryButton, OutlineButton, s, PEDIU } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

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
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Fila da loja</Text>
        <Text style={styles.bannerBody}>
          Flash aparece com destaque. Avance status com segurança — totais e tip já vieram do servidor no checkout.
        </Text>
      </View>

      {q.isLoading ? (
        <Card><Text style={s.muted}>Carregando pedidos...</Text></Card>
      ) : q.isError ? (
        <EmptyState
          icon="cloud-off"
          title="Não foi possível carregar"
          body={q.error.message}
          actionLabel="Tentar de novo"
          onAction={() => void q.refetch()}
        />
      ) : q.data?.length ? (
        q.data.map((order) => {
          const next = nextStatus[order.status];
          const canCancel = order.status === "Pendente";
          const isFlash = order.isFlash === 1;
          const tip = Number(order.tipAmount ?? 0);
          return (
            <Card key={order.id} style={isFlash ? styles.flashCard : undefined}>
              <View style={{ gap: 6 }}>
                <View style={styles.titleRow}>
                  <Text style={s.sectionTitle}>Pedido #{order.id}</Text>
                  {isFlash ? (
                    <View style={styles.flashBadge}>
                      <Text style={styles.flashBadgeText}>FLASH</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: PEDIU.coral, fontSize: 13, fontWeight: "900" }}>{order.status}</Text>
                <Text style={s.muted}>
                  R$ {Number(order.total).toFixed(2).replace(".", ",")}
                  {tip > 0 ? ` · gorjeta R$ ${tip.toFixed(2).replace(".", ",")}` : ""}
                  {" · "}
                  {order.deliveryAddress ?? "Sem endereço"}
                </Text>
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
              {order.status === "Pronto" || order.status === "A caminho" ? (
                <OutlineButton
                  title={isFlash ? "Operar entrega Flash" : "Operar entrega"}
                  onPress={() => router.push({ pathname: "/seller/delivery", params: { orderId: String(order.id) } } as never)}
                />
              ) : null}
              {updateStatus.isError ? <Text style={s.muted}>{updateStatus.error.message}</Text> : null}
            </Card>
          );
        })
      ) : (
        <EmptyState
          icon="receipt-long"
          title="Nenhum pedido ainda"
          body="Quando um cliente finalizar o checkout, a fila aparece aqui com status e prioridade Flash."
          actionLabel="Ir ao catálogo"
          onAction={() => router.push("/seller/catalog")}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  bannerTitle: {
    color: PEDIU_TOKENS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  bannerBody: {
    color: "rgba(255,244,232,0.72)",
    fontSize: 12,
    lineHeight: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flashBadge: {
    backgroundColor: PEDIU_TOKENS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flashBadgeText: {
    color: PEDIU_TOKENS.white,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  flashCard: {
    borderColor: PEDIU_TOKENS.primary,
    borderWidth: 1.5,
  },
});
