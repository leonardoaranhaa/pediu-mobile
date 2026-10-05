import { ActivityIndicator, Text } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

const roleLabel: Record<string, string> = {
  user: "Cliente",
  merchant: "Lojista",
  admin: "Admin",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const query = trpc.admin.users.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });

  if (loading) return <Page title="Usuários" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="Esta lista exige papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Usuários" eyebrow="MASTER MANAGEMENT">
      <Card>
        <Text style={s.sectionTitle}>Contas da plataforma</Text>
        <Text style={s.muted}>Leitura operacional. Impersonation não entra na v1.</Text>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar usuários.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="people-outline" title="Nenhum usuário ainda" body="Quando houver cadastros, eles aparecem aqui." />
      ) : null}
      {query.data?.map((entry) => (
        <Row
          key={entry.id}
          icon="person-outline"
          title={entry.name?.trim() || entry.email || `Usuário #${entry.id}`}
          subtitle={`${roleLabel[entry.role] ?? entry.role} · ${entry.email ?? "sem e-mail"} · #${entry.id}`}
        />
      ))}
    </Page>
  );
}
