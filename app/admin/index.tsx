import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Card, Page, Row, s, PEDIU } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const input = useMemo(() => ({ limit: 20, offset: 0 }), []);
  const users = trpc.admin.users.useQuery(input, { enabled: isAdmin });
  const stores = trpc.admin.stores.useQuery(input, { enabled: isAdmin });
  const orders = trpc.admin.orders.useQuery(input, { enabled: isAdmin });
  const payments = trpc.admin.payments.useQuery(input, { enabled: isAdmin });
  const credit = trpc.admin.credit.useQuery(input, { enabled: isAdmin });

  if (authLoading) {
    return <View style={s.root}><ActivityIndicator style={{ flex: 1 }} color={PEDIU.coral} /></View>;
  }

  if (!isAdmin) {
    return (
      <Page title="Acesso restrito" eyebrow="ADMINISTRAÇÃO">
        <Card>
          <MaterialIcons name="lock-outline" size={30} color={PEDIU.coral} />
          <Text style={s.rowTitle}>Área exclusiva para administradores.</Text>
          <Text style={s.muted}>Sua conta não possui permissão para acessar o painel administrativo.</Text>
          <Row icon="arrow-back" title="Voltar" onPress={() => router.back()} />
        </Card>
      </Page>
    );
  }

  const error = users.error ?? stores.error ?? orders.error ?? payments.error ?? credit.error;
  const loading = users.isLoading || stores.isLoading || orders.isLoading || payments.isLoading || credit.isLoading;

  return (
    <Page title="Administração" eyebrow="PEDIU · CONTROLE">
      <Card>
        <Text style={s.sectionTitle}>Visão operacional</Text>
        {loading ? <ActivityIndicator color={PEDIU.coral} /> : null}
        {error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Não foi possível carregar os dados administrativos.</Text> : null}
        {!loading && !error ? (
          <>
            <Row icon="people-outline" title="Usuários" subtitle={`${users.data?.length ?? 0} registros`} />
            <Row icon="storefront" title="Estabelecimentos" subtitle={`${stores.data?.length ?? 0} registros`} />
            <Row icon="receipt-long" title="Pedidos" subtitle={`${orders.data?.length ?? 0} registros`} />
            <Row icon="payments" title="Pagamentos" subtitle={`${payments.data?.length ?? 0} registros`} />
            <Row icon="account-balance-wallet" title="Crédito / Fiado" subtitle={`${credit.data?.length ?? 0} contas`} />
          </>
        ) : null}
      </Card>
      <Row icon="support-agent" title="Suporte" subtitle="Chamados e respostas de clientes" onPress={() => router.push("/admin/support")} />
      <Row icon="two-wheeler" title="Entregadores" subtitle="Aprovar, rejeitar e suspender cadastros" onPress={() => router.push("/admin/couriers")} />
      <Row icon="security" title="Auditoria" subtitle="Consultar registros administrativos" onPress={() => router.push("/admin/audit")} />
    </Page>
  );
}
