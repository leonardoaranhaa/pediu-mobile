import { ActivityIndicator, Text } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

export default function AdminCreditPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const query = trpc.admin.credit.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });

  if (loading) return <Page title="Crédito / Fiado" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="Contas de fiado exigem papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Crédito / Fiado" eyebrow="MASTER MANAGEMENT">
      <Card>
        <Text style={s.sectionTitle}>Contas lojista</Text>
        <Text style={s.muted}>Ledger de fiado é separado do Clube Pediu (loyalty). Aqui só crédito mercante.</Text>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar crédito.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="account-balance-wallet" title="Nenhuma conta de fiado" body="Lojistas habilitam clientes no painel da loja." />
      ) : null}
      {query.data?.map((customer) => (
        <Row
          key={customer.id}
          icon="account-balance-wallet"
          title={customer.name}
          subtitle={`Loja #${customer.storeId} · saldo R$ ${Number(customer.balance).toFixed(2).replace(".", ",")} · limite R$ ${Number(customer.creditLimit).toFixed(2).replace(".", ",")}`}
        />
      ))}
    </Page>
  );
}