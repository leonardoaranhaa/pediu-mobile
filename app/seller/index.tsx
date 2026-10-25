import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { askToJoin } from "@/components/auth-prompt";
import { StoreSignupForm } from "@/components/store-signup-form";
import { SellerDock } from "@/components/seller-dock";
import { StoreTour } from "@/components/store-tour";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/lib/app-preferences";
import {
  Card,
  Field,
  Page,
  PrimaryButton,
  s,
} from "@/components/pediu-page";
import {
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsHeader,
  OpsMetric,
  OpsOrderLines,
  OpsSectionTitle,
  OpsShell,
} from "@/components/pediu-ops-ui";

const nextStatus: Record<
  string,
  "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | undefined
> = {
  Pendente: "Aceito",
  Aceito: "Preparando",
  Preparando: "Pronto",
  Pronto: "A caminho",
  "A caminho": "Entregue",
};

function money(value: unknown) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")}`;
}

function SellerOrderCard({
  order,
  onUpdate,
  onCancel,
  busy,
}: {
  order: {
    id: number;
    status: string;
    total: string;
    deliveryAddress: string | null;
    isFlash: number;
    tipAmount: string | null;
    fulfillmentMode: string | null;
    customerName?: string | null;
    paymentLabel?: string | null;
    lines?: Array<{
      productId: number;
      name: string;
      quantity: number;
      unitPrice: string;
      note: string | null;
    }>;
  };
  onUpdate: (status: NonNullable<(typeof nextStatus)[string]>) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const delivery = order.fulfillmentMode !== "pickup";
  const next =
    order.status === "Pronto"
      ? delivery
        ? undefined
        : ("Entregue" as const)
      : order.status === "A caminho"
        ? undefined
        : nextStatus[order.status];
  const isFlash = order.isFlash === 1;
  const isReady = order.status === "Pronto";
  return (
    <OpsCard
      style={isFlash ? { borderColor: "#E20D2A", borderWidth: 1.5 } : undefined}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontFamily: "Fredoka",
              fontSize: 23,
              fontWeight: "900",
              color: "#111111",
            }}
          >
            Pedido #{order.id}
          </Text>
          <Text
            style={{ fontFamily: "Nunito", fontSize: 17, color: "#111111", fontWeight: "800" }}
          >
            {order.customerName?.trim() || "Cliente"}
          </Text>
          <Text
            style={{ fontFamily: "Nunito", fontSize: 17, color: "#6E635A" }}
          >
            {order.deliveryAddress ?? "Endereço informado no checkout"}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Fredoka",
            fontSize: 19,
            fontWeight: "900",
            color: "#111111",
          }}
        >
          {money(order.total)}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {isFlash ? <OpsBadge tone="primary">FLASH</OpsBadge> : null}
        <OpsBadge tone={isReady ? "accent" : "muted"}>{order.status}</OpsBadge>
        {order.fulfillmentMode === "pickup" ? (
          <OpsBadge tone="muted">RETIRADA</OpsBadge>
        ) : null}
      </View>
      <OpsOrderLines
        lines={[
          ...(order.lines ?? []).map(
            (line) =>
              `${line.quantity}× ${line.name}${line.note ? ` · ${line.note}` : ""} · ${money(line.unitPrice)}`,
          ),
          order.paymentLabel || "Pagamento a confirmar",
          order.tipAmount && Number(order.tipAmount) > 0
            ? `Gorjeta incluída: ${money(order.tipAmount)}`
            : isFlash
              ? "Entrega Flash"
              : "Entrega padrão da loja",
        ]}
      />
      <OpsButton
        title="Ver pedido"
        variant="ghost"
        onPress={() => router.push("/seller/orders")}
      />
      {next || (isReady && delivery) ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <OpsButton
            title={
              order.status === "Pendente"
                ? "Aceitar"
                : order.status === "Preparando"
                  ? "Marcar como pronto"
                  : isReady && delivery
                    ? "Chamar motoboy"
                    : isReady
                      ? "Liberar retirada"
                      : "Avançar"
            }
            onPress={() => {
              if (isReady && delivery) {
                router.push({
                  pathname: "/seller/delivery",
                  params: { orderId: String(order.id) },
                });
                return;
              }
              if (next) onUpdate(next);
            }}
            disabled={busy}
            style={{ flex: 1 }}
          />
          {order.status === "Pendente" ? (
            <OpsButton
              title="Recusar"
              variant="outline"
              onPress={onCancel}
              disabled={busy}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      ) : null}
      {order.status === "A caminho" ? (
        <Text style={{ fontFamily: "Nunito", color: "#6E635A" }}>
          O motoboy conclui esta entrega na central dele.
        </Text>
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
        {order.status === "Pronto" || order.status === "A caminho" ? (
          <OpsButton
            title="Operar entrega"
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
    </OpsCard>
  );
}

export default function SellerHomePage() {
  const { user, isAuthenticated, refresh } = useAuth();
  const { theme } = useAppPreferences();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pixKey, setPixKey] = useState("");
  const store = trpc.pediu.stores.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  });
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: Boolean(store.data?.id),
    refetchInterval: 8_000,
  });
  const createStore = trpc.pediu.stores.create.useMutation({
    onSuccess: async () => {
      await refresh();
      await store.refetch();
    },
  });
  const updateStore = trpc.pediu.stores.update.useMutation({
    onSuccess: () => void store.refetch(),
  });
  const updateOrderStatus = trpc.pediu.orders.status.useMutation({
    onSuccess: () => void orders.refetch(),
  });
  const orderRows = useMemo(() => orders.data ?? [], [orders.data]);
  const pending = useMemo(
    () =>
      orderRows.filter((order) =>
        ["Pendente", "Aceito"].includes(order.status),
      ),
    [orderRows],
  );
  const cooking = useMemo(
    () => orderRows.filter((order) => order.status === "Preparando"),
    [orderRows],
  );
  const counter = useMemo(
    () =>
      orderRows.filter((order) =>
        ["Pronto", "A caminho"].includes(order.status),
      ),
    [orderRows],
  );
  const sales = useMemo(
    () =>
      orderRows.reduce((total, order) => total + Number(order.total ?? 0), 0),
    [orderRows],
  );

  if (!isAuthenticated) {
    return (
      <Page title="Minha loja" eyebrow="PAINEL DA LOJA">
        <Card>
          <Text style={s.sectionTitle}>Entre para começar a vender</Text>
          <Text style={s.muted}>
            A criação da loja e os pedidos ficam vinculados à sua conta segura.
          </Text>
          <PrimaryButton
            title="Criar conta ou entrar"
            onPress={() =>
              askToJoin({
                action: "seller",
                role: "merchant",
                returnTo: "/seller",
              })
            }
          />
        </Card>
      </Page>
    );
  }

  if (store.isLoading) {
    return (
      <Page title="Minha loja" eyebrow="PAINEL DA LOJA">
        <ActivityIndicator color={theme.primary} />
      </Page>
    );
  }

  if (!store.data) {
    return (
      <Page title="Criar minha loja" eyebrow="COMECE A VENDER">
        <Card>
          <Text style={s.sectionTitle}>Cadastre seu negócio local</Text>
          <Text style={s.muted}>
            Depois de salvar, sua conta será habilitada como prestador e você
            poderá publicar produtos e receber pedidos.
          </Text>
          <StoreSignupForm onCreated={() => void store.refetch()} />
        </Card>
      </Page>
    );
  }

  return (
    <OpsShell
      dock={<SellerDock active="home" />}
      overlay={
        user?.id && store.data ? (
          <StoreTour userId={user.id} storeName={store.data.name} />
        ) : null
      }
    >
      <OpsHeader
        eyebrow="LOJISTA"
        title={store.data.name}
        subtitle={`Cozinha · ${store.data.address ?? "operação local"}`}
        status={
          store.data.paused
            ? "Pausada"
            : store.data.isOpen
              ? "Aberta"
              : "Fechada"
        }
        statusIcon="storefront"
        statusTone={store.data.paused || !store.data.isOpen ? "neutral" : "success"}
        onStatusPress={() =>
          updateStore.mutate({ isOpen: !Boolean(store.data?.isOpen) })
        }
      />
      {store.data.approvalStatus === "pending" ? (
        <OpsCard>
          <Text style={{ color: theme.ink, fontFamily: "Fredoka", fontSize: 20, fontWeight: "900" }}>
            Sua loja está em análise
          </Text>
          <Text style={s.muted}>
            Ela aparece para os clientes depois da aprovação. Enquanto isso, você já pode montar o cardápio.
          </Text>
        </OpsCard>
      ) : null}
      {store.data.approvalStatus === "rejected" ? (
        <OpsCard>
          <Text style={{ color: theme.ink, fontFamily: "Fredoka", fontSize: 20, fontWeight: "900" }}>
            Não foi possível aprovar a loja nesta análise
          </Text>
          <Text style={s.muted}>Fale com o Pediu se precisar de ajuda.</Text>
        </OpsCard>
      ) : null}
      {store.data.paused ? (
        <OpsCard>
          <Text style={{ color: theme.ink, fontFamily: "Fredoka", fontSize: 20, fontWeight: "900" }}>
            {store.data.pauseMessage ?? "Fechada no momento"}
          </Text>
          <Text style={s.muted}>Os clientes veem a loja, mas não conseguem pedir até ela voltar.</Text>
        </OpsCard>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <OpsMetric value={pending.length} label="na fila" />
        <OpsMetric value={cooking.length} label="no fogo" />
        <OpsMetric value={money(sales)} label="vendas" dark />
      </View>
      <OpsSectionTitle title="Na fila" count={pending.length} />
      {pending.length ? (
        pending.map((order) => (
          <SellerOrderCard
            key={order.id}
            order={order}
            busy={updateOrderStatus.isPending}
            onUpdate={(status) =>
              updateOrderStatus.mutate({ orderId: order.id, status })
            }
            onCancel={() =>
              updateOrderStatus.mutate({
                orderId: order.id,
                status: "Cancelado",
              })
            }
          />
        ))
      ) : (
        <OpsCard>
          <Text style={s.muted}>Nenhum pedido aguardando aceite.</Text>
          <OpsButton
            title="Abrir catálogo"
            onPress={() => router.push("/seller/catalog")}
          />
        </OpsCard>
      )}
      <OpsSectionTitle title="No fogo" count={cooking.length} />
      {cooking.length ? (
        cooking.map((order) => (
          <SellerOrderCard
            key={order.id}
            order={order}
            busy={updateOrderStatus.isPending}
            onUpdate={(status) =>
              updateOrderStatus.mutate({ orderId: order.id, status })
            }
            onCancel={() =>
              updateOrderStatus.mutate({
                orderId: order.id,
                status: "Cancelado",
              })
            }
          />
        ))
      ) : (
        <OpsCard>
          <Text style={s.muted}>A cozinha está livre neste momento.</Text>
        </OpsCard>
      )}
      <OpsSectionTitle title="Na bancada" count={counter.length} />
      {counter.length ? (
        counter.map((order) => (
          <SellerOrderCard
            key={order.id}
            order={order}
            busy={updateOrderStatus.isPending}
            onUpdate={(status) =>
              updateOrderStatus.mutate({ orderId: order.id, status })
            }
            onCancel={() =>
              updateOrderStatus.mutate({
                orderId: order.id,
                status: "Cancelado",
              })
            }
          />
        ))
      ) : (
        <OpsCard>
          <Text style={s.muted}>
            Pedidos prontos para retirada ou entrega aparecem aqui.
          </Text>
        </OpsCard>
      )}
      {orders.isError ? (
        <Text style={{ color: theme.primary, fontFamily: "Nunito" }}>
          {orders.error.message}
        </Text>
      ) : null}
      <OpsSectionTitle title="Mais operação" />
      <OpsCard>
        <OpsButton
          title="Gerenciar catálogo"
          variant="ghost"
          onPress={() => router.push("/seller/catalog")}
        />
        <OpsButton
          title="Gerenciar entregas"
          variant="ghost"
          onPress={() => router.push("/seller/delivery")}
        />
        <OpsButton
          title="Anúncios com IA"
          variant="ghost"
          onPress={() => router.push("/seller/ads")}
        />
        <OpsButton
          title="Configurações da loja"
          variant="ghost"
          onPress={() => router.push("/seller/settings")}
        />
        <OpsButton
          title="Minha conta"
          variant="ghost"
          onPress={() => router.push("/account/profile")}
        />
      </OpsCard>
    </OpsShell>
  );
}
