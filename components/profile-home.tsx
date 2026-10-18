import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Card, OutlineButton, PEDIU, PrimaryButton, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text style={s.label}>{title}</Text>
      {children}
    </Card>
  );
}

export function ProfileHome() {
  const { user, isAuthenticated, logout } = useAuth();
  const roles = new Set(user?.roles ?? []);
  const isAdmin = user?.role === "admin" || roles.has("admin");
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: isAuthenticated });
  const courier = trpc.pediu.courier.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const isMerchant = roles.has("merchant") || Boolean(store.data);
  const isCourier = roles.has("courier") || Boolean(courier.data);
  const courierStatus =
    courier.data?.status === "approved"
      ? "Aprovado para receber entregas"
      : courier.data?.status === "pending"
        ? "Cadastro em análise"
        : courier.data?.status === "rejected"
          ? "Cadastro não aprovado"
          : courier.data?.status === "suspended"
            ? "Entregas pausadas"
            : null;

  if (!isAuthenticated) {
    return (
      <Card>
        <Text style={s.sectionTitle}>Sua conta no Pediu</Text>
        <Text style={s.muted}>
          Você pode olhar lojas e cardápios sem conta. Para pedir, vender ou fazer entregas, crie a sua.
        </Text>
        <PrimaryButton title="Criar conta" onPress={() => router.push("/register")} />
        <OutlineButton title="Já tenho conta" onPress={() => router.push("/login")} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: PEDIU.ink, borderRadius: 24, padding: 18, gap: 4 }}>
        <Text style={{ color: PEDIU.white, fontSize: 22, fontWeight: "900" }}>{user?.name?.trim() || "Sua conta"}</Text>
        <Text style={{ color: "#F3E6D8", fontSize: 14 }}>{user?.email || "E-mail não informado"}</Text>
        <Text style={{ color: PEDIU.yellow, fontSize: 13, fontWeight: "800", marginTop: 6 }}>
          Número para as lojas chamarem você: {user?.id}
        </Text>
      </View>

      <Section title="CLIENTE">
        <Row icon="receipt-long" title="Meus pedidos" subtitle="Acompanhe o que você pediu" onPress={() => router.push("/orders")} />
        <Row icon="location-on" title="Endereços" subtitle="Onde a entrega chega" onPress={() => router.push("/account/addresses")} />
        <Row icon="credit-card" title="Pagamentos" subtitle="Como você prefere pagar" onPress={() => router.push("/account/payment-methods")} />
      </Section>

      {isMerchant ? (
        <Section title="MINHA LOJA">
          <Row icon="storefront" title="Painel da loja" subtitle={store.data?.name || "Sua vitrine"} onPress={() => router.push("/seller")} />
          <Row icon="restaurant-menu" title="Cardápio" subtitle="Produtos e preços" onPress={() => router.push("/seller/catalog")} />
          <Row icon="receipt-long" title="Pedidos da loja" subtitle="O que chegou para preparar" onPress={() => router.push("/seller/orders")} />
          <Row icon="schedule" title="Horários e entrega" subtitle="Quando a loja atende" onPress={() => router.push("/seller/settings")} />
        </Section>
      ) : (
        <Card>
          <Text style={s.sectionTitle}>Quero vender no Pediu</Text>
          <Text style={s.muted}>Abra sua loja com o nome, o telefone e o endereço. O cardápio vem em seguida.</Text>
          <PrimaryButton title="Cadastrar minha loja" onPress={() => router.push("/seller")} />
        </Card>
      )}

      {isCourier ? (
        <Section title="ENTREGADOR">
          <Row icon="two-wheeler" title="Central do entregador" subtitle={courierStatus || "Seu cadastro"} onPress={() => router.push("/courier")} />
          <Row icon="local-shipping" title="Ofertas e ganhos" subtitle="Entregas disponíveis e o que você já fez" onPress={() => router.push("/courier")} />
        </Section>
      ) : (
        <Card>
          <Text style={s.sectionTitle}>Quero ser entregador</Text>
          <Text style={s.muted}>Informe o veículo. A equipe do Pediu analisa o cadastro antes de liberar as ofertas.</Text>
          <PrimaryButton title="Começar cadastro" onPress={() => router.push("/courier")} />
        </Card>
      )}

      {isAdmin ? (
        <Section title="ADMINISTRAÇÃO">
          <Row icon="admin-panel-settings" title="Console de operação" subtitle="Pedidos, lojas, pagamentos e pessoas" onPress={() => router.push("/admin")} />
        </Section>
      ) : null}

      <Section title="CONTA">
        <Row icon="person" title="Dados pessoais" subtitle="Nome e contato" onPress={() => router.push("/account/personal")} />
        <Row icon="lock-outline" title="Trocar senha" subtitle="Use uma senha que só você sabe" onPress={() => router.push("/account/password")} />
        <Row icon="notifications" title="Notificações" subtitle="Avisos de pedido e entrega" onPress={() => router.push("/account/notifications")} />
        <Row icon="palette" title="Aparência" subtitle="Cores e jeito do aplicativo" onPress={() => router.push("/account/settings")} />
      </Section>

      <OutlineButton title="Sair da conta" onPress={() => void logout()} />
    </View>
  );
}
