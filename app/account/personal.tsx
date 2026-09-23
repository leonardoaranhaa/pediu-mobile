import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { Page, Card, Field, PEDIU, PrimaryButton, OutlineButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function PersonalDataPage() {
  const { isAuthenticated, refresh } = useAuth();
  const profile = trpc.pediu.account.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const update = trpc.pediu.account.profile.update.useMutation({ onSuccess: async () => { await profile.refetch(); await refresh(); Alert.alert("Perfil atualizado", "Seu nome foi salvo."); } });
  const requestEmailChange = trpc.pediu.account.profile.requestEmailChange.useMutation({
    onSuccess: (result) => Alert.alert(result.verificationSent ? "Verifique seu e-mail" : "Verificação pendente", result.verificationSent ? "Enviamos um link de confirmação para o novo endereço." : "O provedor de e-mail ainda não está configurado; a alteração só será aplicada após o envio do token."),
    onError: (error) => Alert.alert("E-mail", error.message),
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name ?? "");
    setEmail(profile.data.email ?? "");
  }, [profile.data]);

  if (!isAuthenticated) return <Page title="Dados pessoais" eyebrow="SUA CONTA"><Card><Text style={s.sectionTitle}>Entre para editar seus dados</Text><Text style={s.muted}>A identidade é carregada da sessão persistida.</Text></Card></Page>;
  const currentEmail = profile.data?.email?.toLowerCase() ?? "";
  const emailChanged = email.trim().toLowerCase() !== currentEmail;
  return <Page title="Dados pessoais" eyebrow="SUA CONTA">
    <Card>
      <Text style={s.sectionTitle}>Identidade persistida</Text>
      <Text style={s.muted}>O identificador de login e o papel da conta não podem ser alterados nesta tela.</Text>
      <Field label="NOME" value={name} onChangeText={setName} placeholder="Seu nome" />
      <PrimaryButton title={update.isPending ? "Salvando..." : "Salvar nome"} onPress={() => update.mutate({ name: name.trim() })} disabled={update.isPending || name.trim().length < 2} />
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Trocar e-mail</Text>
      <Text style={s.muted}>O novo endereço só será aplicado depois que você confirmar o link enviado.</Text>
      <Field label="NOVO E-MAIL" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />
      {requestEmailChange.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{requestEmailChange.error.message}</Text> : null}
      <OutlineButton title={requestEmailChange.isPending ? "Enviando..." : "Enviar confirmação"} onPress={() => requestEmailChange.mutate({ email: email.trim() })} disabled={requestEmailChange.isPending || !emailChanged || !email.includes("@")} />
    </Card>
  </Page>;
}
