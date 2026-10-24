import { useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Field, Page, PEDIU, PrimaryButton, Row, s } from "@/components/pediu-page";
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
  const [email, setEmail] = useState("");
  const reset = trpc.admin.issuePasswordReset.useMutation();

  if (loading) return <Page title="Usuários" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="Esta lista exige papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Usuários" eyebrow="OPERAÇÃO">
      <Card>
        <Text style={s.sectionTitle}>Contas da plataforma</Text>
        <Text style={s.muted}>Lista de contas. Não dá para entrar na conta de outra pessoa por aqui.</Text>
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Código de nova senha</Text>
        <Text style={s.muted}>O Pediu não envia e-mail. O código aparece só aqui, vale 30 minutos e deve ser passado para a pessoa.</Text>
        <Field label="E-mail da conta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {reset.data ? (
          <Text style={{ color: PEDIU.ink, fontSize: 28, fontWeight: "900", letterSpacing: 4 }}>{reset.data.code}</Text>
        ) : null}
        {reset.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{reset.error.message}</Text> : null}
        <PrimaryButton
          title={reset.isPending ? "Gerando..." : "Gerar código"}
          disabled={reset.isPending || !email.includes("@")}
          onPress={() => reset.mutate({ email: email.trim() })}
        />
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
