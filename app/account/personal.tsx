import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Page, Card, Field, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function PersonalDataPage() {
  const { isAuthenticated, refresh } = useAuth();
  const profile = trpc.pediu.account.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const update = trpc.pediu.account.profile.update.useMutation({ onSuccess: async () => { await profile.refetch(); await refresh(); } });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name ?? "");
    setEmail(profile.data.email ?? "");
  }, [profile.data]);

  if (!isAuthenticated) return <Page title="Dados pessoais" eyebrow="SUA CONTA"><Card><Text style={s.sectionTitle}>Entre para editar seus dados</Text><Text style={s.muted}>A identidade é carregada da sessão persistida.</Text></Card></Page>;
  return <Page title="Dados pessoais" eyebrow="SUA CONTA">
    <Card>
      <Text style={s.sectionTitle}>Identidade persistida</Text>
      <Text style={s.muted}>O identificador de login e o papel da conta não podem ser alterados nesta tela.</Text>
      <Field label="NOME" value={name} onChangeText={setName} placeholder="Seu nome" />
      <Field label="E-MAIL" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />
      {update.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{update.error.message}</Text> : null}
      <PrimaryButton title={update.isPending ? "Salvando..." : "Salvar dados"} onPress={() => update.mutate({ name: name.trim(), email: email.trim() || null })} disabled={update.isPending || name.trim().length < 2} />
    </Card>
  </Page>;
}
