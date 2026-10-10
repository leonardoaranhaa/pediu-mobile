import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/lib/app-preferences";
import {
  Card,
  Field,
  OutlineButton,
  Page,
  PrimaryButton,
  s,
} from "@/components/pediu-page";
import {
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsDock,
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
  };
  onUpdate: (status: NonNullable<(typeof nextStatus)[string]>) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const next = nextStatus[order.status];
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
          order.tipAmount && Number(order.tipAmount) > 0
            ? `Gorjeta congelada: ${money(order.tipAmount)}`
            : "Itens e totais calculados pelo servidor",
          isFlash ? "Prioridade Flash operacional" : "Entrega padrão da loja",
        ]}
      />
      {next ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <OpsButton
            title={
              order.status === "Pendente"
                ? "Aceitar"
                : order.status === "Preparando"
                  ? "Pronto pra retirada"
                  : order.status === "Pronto"
                    ? "Enviar para entrega"
                    : order.status === "A caminho"
                      ? "Confirmar entrega"
                      : "Avançar"
            }
            onPress={() => onUpdate(next)}
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
            title="Entrar com login seguro"
            onPress={() => void startOAuthLogin()}
          />
          <OutlineButton
            title="Criar uma conta"
            onPress={() => router.push("/register")}
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
          <Field
            label="NOME DA LOJA"
            value={name}
            onChangeText={setName}
            placeholder="Nome do seu negócio"
          />
          <Field
            label="WHATSAPP / TELEFONE"
            value={phone}
            onChangeText={setPhone}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
          />
          <Field
            label="ENDEREÇO"
            value={address}
            onChangeText={setAddress}
            placeholder="Rua, número e bairro"
          />
          <Field
            label="CHAVE PIX"
            value={pixKey}
            onChangeText={setPixKey}
            placeholder="CPF, telefone ou e-mail"
          />
          <PrimaryButton
            title={createStore.isPending ? "Salvando..." : "Criar minha loja"}
            disabled={createStore.isPending || name.trim().length < 2}
            onPress={() =>
              createStore.mutate({
                name: name.trim(),
                phone: phone.trim() || undefined,
                address: address.trim() || undefined,
                pixKey: pixKey.trim() || undefined,
                deliveryFee: "0.00",
              })
            }
          />
          {createStore.error ? (
            <Text style={{ color: theme.primary, fontSize: 12 }}>
              {createStore.error.message}
            </Text>
          ) : null}
        </Card>
      </Page>
    );
  }

  return (
    <OpsShell
      dock={
        <OpsDock
          items={[
            {
              label: "Cozinha",
              icon: "restaurant",
              to: "/seller",
              active: true,
            },
            {
              label: "Cardápio",
              icon: "restaurant-menu",
              to: "/seller/catalog",
            },
            { label: "Cliente", icon: "home", to: "/" },
          ]}
        />
      }
    >
      <OpsHeader
        eyebrow="LOJISTA"
        title={store.data.name}
        subtitle={`Cozinha · ${store.data.address ?? "operação local"}`}
        status={store.data.isOpen ? "Aberta" : "Fechada"}
        statusIcon="storefront"
        statusTone={store.data.isOpen ? "success" : "neutral"}
        onStatusPress={() =>
          updateStore.mutate({ isOpen: !Boolean(store.data?.isOpen) })
        }
      />
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
        {user?.role !== "merchant" ? (
          <Text style={s.muted}>Atualizando permissões da conta...</Text>
        ) : null}
      </OpsCard>
    </OpsShell>
  );
}
