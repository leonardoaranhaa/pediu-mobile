import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/lib/app-preferences";
import { EmptyState } from "@/components/pediu/empty-state";
import { s } from "@/components/pediu-page";
import { SellerDock } from "@/components/seller-dock";
import {
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsOrderLines,
  OpsSectionTitle,
  OpsShell,
} from "@/components/pediu-ops-ui";

const nextStatus: Record<string, "Aceito" | "Preparando" | "Pronto" | "Entregue" | undefined> = {
  Pendente: "Aceito",
  Aceito: "Preparando",
  Preparando: "Pronto",
};

const actionLabel: Record<string, string> = {
  Pendente: "Aceitar",
  Aceito: "Iniciar preparo",
  Preparando: "Marcar como pronto",
  Pronto: "Liberar retirada",
};

function money(value: unknown) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")}`;
}

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const { theme } = useAppPreferences();
  const q = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 10_000,
  });
  const store = trpc.pediu.stores.mine.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const isMarket = store.data?.kind === "market";
  const updateStatus = trpc.pediu.orders.status.useMutation({
    onSuccess: () => void q.refetch(),
  });
  const orders = q.data ?? [];
  const groups = [
    { title: "Na fila", statuses: ["Pendente", "Aceito"] },
    { title: "No fogo", statuses: ["Preparando"] },
    { title: "Na bancada", statuses: ["Pronto", "A caminho"] },
  ] as const;

  return (
    <OpsShell
      dock={<SellerDock active="orders" />}
    >
      <View style={{ gap: 5 }}>
        <Text
          style={{
            color: theme.primary,
            fontFamily: "Nunito",
            fontSize: 12,
            fontWeight: "900",
            letterSpacing: 1.2,
          }}
        >
          COZINHA
        </Text>
        <Text
          style={{
            color: theme.ink,
            fontFamily: "Fredoka",
            fontSize: 34,
            fontWeight: "900",
            letterSpacing: -1,
          }}
        >
          Pedidos
        </Text>
        <Text style={s.muted}>
          A fila da loja, com Flash em destaque e as ações que você pode fazer agora.
        </Text>
      </View>
      {q.isLoading ? (
        <OpsCard>
          <Text style={s.muted}>Carregando pedidos...</Text>
        </OpsCard>
      ) : null}
      {q.isError ? (
        <OpsCard>
          <EmptyState
            icon="cloud-off"
            title="Não foi possível carregar"
            body={q.error.message}
            actionLabel="Tentar de novo"
            onAction={() => void q.refetch()}
          />
        </OpsCard>
      ) : null}
      {!q.isLoading && !q.isError
        ? groups.map((group) => {
            const rows = orders.filter((order) =>
              group.statuses.includes(order.status as never),
            );
            return (
              <View key={group.title} style={{ gap: 12 }}>
                <OpsSectionTitle title={group.title} count={rows.length} />
                {rows.length ? (
                  rows.map((order) => {
                    const delivery = order.fulfillmentMode !== "pickup";
                    const next =
                      order.status === "Pronto"
                        ? delivery
                          ? undefined
                          : ("Entregue" as const)
                        : nextStatus[order.status];
                    const isFlash = order.isFlash === 1;
                    return (
                      <OpsCard
                        key={order.id}
                        style={
                          isFlash
                            ? { borderColor: theme.primary, borderWidth: 1.5 }
                            : undefined
                        }
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text
                              style={{
                                color: theme.ink,
                                fontFamily: "Fredoka",
                                fontSize: 23,
                                fontWeight: "900",
                              }}
                            >
                              Pedido #{order.id}
                            </Text>
                            <Text
                              style={{
                                color: theme.muted,
                                fontFamily: "Nunito",
                                fontSize: 16,
                              }}
                            >
                              {order.deliveryAddress ??
                                "Endereço informado no checkout"}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: theme.ink,
                              fontFamily: "Fredoka",
                              fontSize: 19,
                              fontWeight: "900",
                            }}
                          >
                            {money(order.total)}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <OpsBadge tone={isFlash ? "primary" : "muted"}>
                            {isFlash ? "FLASH" : order.status}
                          </OpsBadge>
                          {isFlash ? (
                            <OpsBadge tone="accent">PRIORIDADE</OpsBadge>
                          ) : null}
                          {isMarket ? (
                            <OpsBadge tone="success">MERCADO</OpsBadge>
                          ) : null}
                          {order.fulfillmentMode === "pickup" ? (
                            <OpsBadge tone="muted">RETIRADA</OpsBadge>
                          ) : null}
                        </View>
                        <Text style={{ color: theme.ink, fontFamily: "Nunito", fontWeight: "800" }}>
                          {order.customerName?.trim() || "Cliente"}
                        </Text>
                        <OpsOrderLines
                          lines={[
                            ...(order.lines ?? []).map(
                              (line) =>
                                `${line.quantity}× ${line.name}${line.note ? ` · ${line.note}` : ""} · ${money(line.unitPrice)}`,
                            ),
                            order.paymentLabel || "Pagamento a confirmar",
                            order.tipAmount && Number(order.tipAmount) > 0
                              ? `Gorjeta: ${money(order.tipAmount)}`
                              : isMarket
                                ? "Separação de mercado"
                                : `Situação: ${order.status}`,
                          ]}
                        />
                        {next ? (
                          <OpsButton
                            title={
                              order.status === "Pronto"
                                ? "Liberar retirada"
                                : actionLabel[order.status]
                            }
                            onPress={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: next,
                              })
                            }
                            disabled={updateStatus.isPending}
                          />
                        ) : null}
                        {order.status === "Pronto" && delivery ? (
                          <OpsButton
                            title="Chamar motoboy"
                            onPress={() =>
                              router.push({
                                pathname: "/seller/delivery",
                                params: { orderId: String(order.id) },
                              })
                            }
                          />
                        ) : null}
                        {order.status === "A caminho" ? (
                          <Text style={s.muted}>
                            O motoboy conclui esta entrega na central dele.
                          </Text>
                        ) : null}
                        {order.status === "Pendente" ? (
                          <OpsButton
                            title="Recusar pedido"
                            variant="outline"
                            onPress={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "Cancelado",
                              })
                            }
                            disabled={updateStatus.isPending}
                          />
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <OpsButton
                            title="Acompanhar"
                            variant="ghost"
                            onPress={() =>
                              router.push({
                                pathname: "/order/track",
                                params: { orderId: String(order.id) },
                              })
                            }
                            style={{ flex: 1 }}
                          />
                          {order.status === "Pronto" ||
                          order.status === "A caminho" ? (
                            <OpsButton
                              title="Entrega"
                              variant="ghost"
                              onPress={() =>
                                router.push({
                                  pathname: "/seller/delivery",
                                  params: { orderId: String(order.id) },
                                } as never)
                              }
                              style={{ flex: 1 }}
                            />
                          ) : null}
                        </View>
                        {updateStatus.isError ? (
                          <Text
                            style={{
                              color: theme.primary,
                              fontFamily: "Nunito",
                            }}
                          >
                            {updateStatus.error.message}
                          </Text>
                        ) : null}
                      </OpsCard>
                    );
                  })
                ) : (
                  <OpsCard>
                    <Text style={s.muted}>
                      Nenhum pedido nesta etapa agora.
                    </Text>
                  </OpsCard>
                )}
              </View>
            );
          })
        : null}
      {!q.isLoading && !q.isError && !orders.length ? (
        <OpsCard>
          <EmptyState
            icon="receipt-long"
            title="Nenhum pedido ainda"
            body="Quando um cliente finalizar o checkout, a fila aparecerá aqui."
            actionLabel="Ir ao catálogo"
            onAction={() => router.push("/seller/catalog")}
          />
        </OpsCard>
      ) : null}
    </OpsShell>
  );
}
