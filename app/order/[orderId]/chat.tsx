import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, OutlineButton, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

function messageRoleLabel(role: string) {
  return role === "customer" ? "Cliente" : role === "merchant" ? "Loja" : role;
}

export default function OrderChatPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [retryKey, setRetryKey] = useState<string>();
  const messages = trpc.pediu.experience.chat.list.useQuery({ orderId: id }, { enabled: Boolean(user) && Number.isInteger(id) && id > 0, refetchInterval: 5000 });
  const send = trpc.pediu.experience.chat.send.useMutation({ onSuccess: () => { setBody(""); setRetryKey(undefined); void messages.refetch(); } });
  const markRead = trpc.pediu.experience.chat.markRead.useMutation({ onSuccess: () => void messages.refetch() });
  const unread = messages.data?.some((message) => message.readAt == null && message.userId !== user?.id);
  const submit = () => {
    const text = body.trim();
    if (text && Number.isInteger(id) && id > 0 && !send.isPending) {
      const idempotencyKey = retryKey ?? `chat-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setRetryKey(idempotencyKey);
      send.mutate({ orderId: id, body: text, idempotencyKey });
    }
  };

  if (!user) return <Page title="Chat do pedido" eyebrow="ATENDIMENTO"><Card><Text style={s.sectionTitle}>Entre para acessar o chat</Text><Text style={s.muted}>As mensagens do pedido são privadas e só ficam disponíveis para o cliente e a loja.</Text></Card></Page>;

  return <Page title="Chat do pedido" eyebrow="ATENDIMENTO">
    <Card>
      <Text style={s.muted}>{messages.isFetching ? "Atualizando mensagens..." : "As mensagens são atualizadas automaticamente."}</Text>
      {unread ? <OutlineButton title="Marcar conversa como lida" onPress={() => markRead.mutate({ orderId: id })} disabled={markRead.isPending} /> : null}
      {messages.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Não foi possível carregar o chat deste pedido.</Text> : null}
      <FlatList data={messages.data ?? []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <View style={{ marginBottom: 12, padding: 10, borderRadius: 12, backgroundColor: item.role === "customer" ? PEDIU.coralSoft : PEDIU.peach, opacity: item.readAt ? 0.72 : 1 }}><Text style={s.muted}>{messageRoleLabel(item.role)}</Text><Text style={s.body}>{item.body}</Text></View>} ListEmptyComponent={<Text style={s.muted}>Nenhuma mensagem ainda.</Text>} />
    </Card>
    <Card>
      <TextInput value={body} onChangeText={(value) => { setBody(value); setRetryKey(undefined); }} placeholder="Digite sua mensagem" multiline style={[s.input, { minHeight: 80 }]} />
      {send.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Falha no envio. Tente novamente para repetir com segurança.</Text> : null}
      <PrimaryButton title={send.isPending ? "Enviando..." : "Enviar"} disabled={!body.trim() || send.isPending} onPress={submit} />
    </Card>
  </Page>;
}
