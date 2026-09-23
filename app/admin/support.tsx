import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Card, Field, Page, PrimaryButton, PEDIU, Row, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const labels: Record<string, string> = { open: "Aberto", in_progress: "Em atendimento", resolved: "Resolvido", closed: "Encerrado" };
const statuses = ["open", "in_progress", "resolved", "closed"] as const;

export default function AdminSupportPage() {
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [messageKey, setMessageKey] = useState("");
  const tickets = trpc.admin.support.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });
  const messages = trpc.pediu.experience.support.messages.list.useQuery({ ticketId: selectedTicketId ?? 0 }, { enabled: allowed && selectedTicketId !== null, refetchInterval: selectedTicketId ? 5000 : false });
  const status = trpc.admin.supportStatus.useMutation({ onSuccess: () => void tickets.refetch() });
  const send = trpc.pediu.experience.support.messages.send.useMutation({ onSuccess: async () => { setBody(""); setMessageKey(""); await messages.refetch(); } });

  useEffect(() => {
    if (selectedTicketId === null && tickets.data?.[0]) setSelectedTicketId(tickets.data[0].id);
  }, [selectedTicketId, tickets.data]);

  if (loading) return <Page title="Suporte" eyebrow="ADMINISTRAÇÃO"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) return <Page title="Acesso restrito" eyebrow="SUPORTE"><Card><Text style={s.rowTitle}>Área exclusiva para administradores.</Text></Card></Page>;

  const selected = tickets.data?.find((ticket) => ticket.id === selectedTicketId);
  const sendMessage = async () => {
    if (!selectedTicketId || body.trim().length < 1) return;
    const key = messageKey || `admin-support-${selectedTicketId}-${Date.now()}`;
    setMessageKey(key);
    await send.mutateAsync({ ticketId: selectedTicketId, body: body.trim(), idempotencyKey: key });
  };

  return <Page title="Suporte operacional" eyebrow="ADMINISTRAÇÃO">
    <Card>
      <Text style={s.sectionTitle}>Chamados</Text>
      {tickets.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {!tickets.isLoading && !tickets.data?.length ? <Text style={s.muted}>Nenhum chamado aberto.</Text> : null}
      {tickets.data?.map((ticket) => <Pressable key={ticket.id} onPress={() => setSelectedTicketId(ticket.id)}><Row icon="support-agent" title={`#${ticket.id} · ${ticket.subject}`} subtitle={`${labels[ticket.status] ?? ticket.status} · usuário #${ticket.userId}`} right={<Text style={{ color: ticket.id === selectedTicketId ? PEDIU.coral : PEDIU.muted, fontWeight: "900" }}>{ticket.id === selectedTicketId ? "●" : "○"}</Text>} /></Pressable>)}
    </Card>
    {selected ? <Card>
      <Text style={s.sectionTitle}>Chamado #{selected.id}</Text>
      <Text style={s.body}>{selected.body}</Text>
      <Text style={s.label}>STATUS</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{statuses.map((value) => <Pressable key={value} onPress={() => status.mutate({ ticketId: selected.id, status: value })} style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: selected.status === value ? PEDIU.coral : PEDIU.canvas }}><Text style={{ color: selected.status === value ? PEDIU.white : PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{labels[value]}</Text></Pressable>)}</View>
      {status.error ? <Text style={{ color: PEDIU.coral }}>{status.error.message}</Text> : null}
      {messages.data?.map((item) => <View key={item.id} style={{ gap: 3, alignSelf: item.role === "admin" ? "flex-end" : "flex-start", maxWidth: "92%", backgroundColor: item.role === "admin" ? PEDIU.coralSoft : PEDIU.canvas, borderRadius: 14, padding: 11 }}><Text style={{ color: PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{item.role === "admin" ? "Você" : "Cliente"}</Text><Text style={s.body}>{item.body}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString()}</Text></View>)}
      <Field label="RESPOSTA" value={body} onChangeText={setBody} placeholder="Responder ao cliente" multiline />
      {send.error ? <Text style={{ color: PEDIU.coral }}>{send.error.message}</Text> : null}
      <PrimaryButton title={send.isPending ? "Enviando..." : "Enviar resposta"} onPress={() => void sendMessage()} disabled={send.isPending || body.trim().length < 1} />
    </Card> : null}
  </Page>;
}
