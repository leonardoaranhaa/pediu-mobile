import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

export default function OrderChatPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const [body, setBody] = useState("");
  const messages = trpc.pediu.experience.chat.list.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0, refetchInterval: 5000 });
  const send = trpc.pediu.experience.chat.send.useMutation({ onSuccess: () => { setBody(""); void messages.refetch(); } });
  const submit = () => {
    const text = body.trim();
    if (text && Number.isInteger(id) && id > 0 && !send.isPending) send.mutate({ orderId: id, body: text });
  };

  return <Page title="Chat do pedido" eyebrow="ATENDIMENTO">
    <Card>
      <Text style={s.muted}>{messages.isFetching ? "Atualizando mensagens..." : "As mensagens são atualizadas automaticamente."}</Text>
      {messages.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Não foi possível carregar o chat deste pedido.</Text> : null}
      <FlatList data={messages.data ?? []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <View style={{ marginBottom: 12, padding: 10, borderRadius: 12, backgroundColor: item.role === "customer" ? PEDIU.coralSoft : PEDIU.peach }}><Text style={s.muted}>{item.role === "customer" ? "Você" : item.role}</Text><Text style={s.body}>{item.body}</Text></View>} ListEmptyComponent={<Text style={s.muted}>Nenhuma mensagem ainda.</Text>} />
    </Card>
    <Card>
      <TextInput value={body} onChangeText={setBody} placeholder="Digite sua mensagem" multiline style={[s.input, { minHeight: 80 }]} />
      {send.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{send.error.message}</Text> : null}
      <PrimaryButton title={send.isPending ? "Enviando..." : "Enviar"} disabled={!body.trim() || send.isPending} onPress={submit} />
    </Card>
  </Page>;
}
