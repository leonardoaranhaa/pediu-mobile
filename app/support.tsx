import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Page, Card, Field, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const statusLabel: Record<string, string> = { open: "Aberto", in_progress: "Em atendimento", resolved: "Resolvido", closed: "Encerrado" };

export default function SupportScreen() {
  const { isAuthenticated } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [messageKey, setMessageKey] = useState("");
  const tickets = trpc.pediu.experience.support.list.useQuery(undefined, { enabled: isAuthenticated });
  const messages = trpc.pediu.experience.support.messages.list.useQuery({ ticketId: selectedTicketId ?? 0 }, { enabled: isAuthenticated && selectedTicketId !== null, refetchInterval: selectedTicketId ? 5000 : false });
  const { mutateAsync: markReadAsync } = trpc.pediu.experience.support.messages.markRead.useMutation();
  const create = trpc.pediu.experience.support.create.useMutation({ onSuccess: async (result) => { setSubject(""); setBody(""); setSelectedTicketId(result.ticketId); await tickets.refetch(); } });
  const send = trpc.pediu.experience.support.messages.send.useMutation({ onSuccess: async () => { setMessage(""); setMessageKey(""); await messages.refetch(); } });

  useEffect(() => {
    if (selectedTicketId !== null && messages.data?.length) void markReadAsync({ ticketId: selectedTicketId });
  }, [selectedTicketId, messages.data?.length, markReadAsync]);

  if (!isAuthenticated) return <Page title="Falar com suporte" eyebrow="ATENDIMENTO" back><Card><Text style={s.sectionTitle}>Entre para abrir um chamado</Text><Text style={s.muted}>Sua sessão é necessária para acompanhar o histórico do atendimento.</Text></Card></Page>;

  const sendMessage = async () => {
    if (selectedTicketId === null || message.trim().length < 1) return;
    const key = messageKey || `support-${selectedTicketId}-${Date.now()}`;
    setMessageKey(key);
    await send.mutateAsync({ ticketId: selectedTicketId, body: message.trim(), idempotencyKey: key });
  };

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
      {tickets.data?.map((ticket) => <Pressable key={ticket.id} onPress={() => setSelectedTicketId(ticket.id)}><Card style={{ backgroundColor: selectedTicketId === ticket.id ? PEDIU.peach : PEDIU.canvas }}><Text style={s.sectionTitle}>#{ticket.id} · {ticket.subject}</Text><Text style={s.muted}>{statusLabel[ticket.status] ?? ticket.status}</Text><Text style={s.body}>{ticket.body}</Text><Text style={{ color: PEDIU.coral, fontSize: 12, fontWeight: "900" }}>{selectedTicketId === ticket.id ? "Chamado selecionado" : "Abrir conversa"}</Text></Card></Pressable>)}
    </Card>
    {selectedTicketId !== null ? <Card>
      <Text style={s.sectionTitle}>Conversa do chamado #{selectedTicketId}</Text>
      {messages.isLoading ? <Text style={s.muted}>Carregando mensagens...</Text> : null}
      {messages.data?.map((item) => <View key={item.id} style={{ gap: 3, alignSelf: item.role === "customer" ? "flex-end" : "flex-start", maxWidth: "92%", backgroundColor: item.role === "customer" ? PEDIU.coralSoft : PEDIU.canvas, borderRadius: 14, padding: 11 }}><Text style={{ color: PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{item.role === "admin" ? "Suporte" : "Você"}</Text><Text style={s.body}>{item.body}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString()}</Text></View>)}
      <Field label="RESPOSTA" value={message} onChangeText={setMessage} placeholder="Escreva uma resposta" multiline />
      {send.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{send.error.message}</Text> : null}
      <PrimaryButton title={send.isPending ? "Enviando..." : "Enviar resposta"} onPress={() => void sendMessage()} disabled={send.isPending || message.trim().length < 1} />
    </Card> : null}
  </Page>;
}
