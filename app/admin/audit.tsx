import { ActivityIndicator, Text } from "react-native";
import { Card, Page, Row, s, PEDIU } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function AdminAudit() {
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const query = trpc.admin.audit.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });

  if (loading) return <Page title="Auditoria" eyebrow="ADMINISTRAÇÃO"><ActivityIndicator color={PEDIU.coral} /></Page>;

  if (!allowed) {
    return <Page title="Acesso restrito" eyebrow="AUDITORIA"><Card><Text style={s.rowTitle}>Área exclusiva para administradores.</Text></Card></Page>;
  }

  return (
    <Page title="Auditoria" eyebrow="ADMINISTRAÇÃO">
      <Card>
        {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
        {query.error ? <Text style={{ color: PEDIU.coral }}>Não foi possível carregar a auditoria.</Text> : null}
        {!query.isLoading && !query.error && (query.data?.length ?? 0) === 0 ? <Text style={s.muted}>Nenhum registro administrativo.</Text> : null}
        {query.data?.map((entry) => (
          <Row key={entry.id} icon="history" title={entry.action} subtitle={`${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ""} · ${new Date(entry.createdAt).toLocaleString("pt-BR")}`} />
        ))}
      </Card>
    </Page>
  );
}
