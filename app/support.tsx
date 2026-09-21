import { useState } from "react";
import { Text } from "react-native";
import { Page, Card, Field, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const statusLabel: Record<string, string> = { open: "Aberto", in_progress: "Em atendimento", resolved: "Resolvido", closed: "Encerrado" };

export default function SupportScreen() {
  const { isAuthenticated } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const tickets = trpc.pediu.experience.support.list.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.pediu.experience.support.create.useMutation({ onSuccess: async () => { setSubject(""); setBody(""); await tickets.refetch(); } });

  if (!isAuthenticated) return <Page title="Falar com suporte" eyebrow="ATENDIMENTO" back><Card><Text style={s.sectionTitle}>Entre para abrir um chamado</Text><Text style={s.muted}>Sua sessão é necessária para acompanhar o histórico do atendimento.</Text></Card></Page>;

  return <Page title="Falar com suporte" eyebrow="ATENDIMENTO" back>
    <Card>
      <Text style={s.sectionTitle}>Abra uma solicitação</Text>
      <Text style={s.muted}>Descreva o problema e inclua o número do pedido quando aplicável.</Text>
      <Field label="ASSUNTO" value={subject} onChangeText={setSubject} placeholder="Ex.: problema com pagamento" />
      <Field label="MENSAGEM" value={body} onChangeText={setBody} placeholder="Descreva o que aconteceu" multiline />
      {create.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{create.error.message}</Text> : null}
      <PrimaryButton title={create.isPending ? "Enviando..." : "Enviar solicitação"} onPress={() => create.mutate({ subject: subject.trim(), body: body.trim() })} disabled={create.isPending || subject.trim().length < 3 || body.trim().length < 10} />
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Histórico de atendimento</Text>
      {tickets.isLoading ? <Text style={s.muted}>Carregando chamados...</Text> : null}
      {!tickets.isLoading && !tickets.data?.length ? <Text style={s.muted}>Você ainda não abriu um chamado.</Text> : null}
      {tickets.data?.map((ticket) => <Card key={ticket.id} style={{ backgroundColor: PEDIU.canvas }}><Text style={s.sectionTitle}>{ticket.subject}</Text><Text style={s.muted}>{statusLabel[ticket.status] ?? ticket.status}</Text><Text style={s.body}>{ticket.body}</Text></Card>)}
    </Card>
  </Page>;
}
