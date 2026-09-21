import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function OrderChatPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const [body, setBody] = useState("");
  const messages = trpc.pediu.experience.chat.list.useQuery({ orderId: id }, { enabled: Number.isInteger(id) && id > 0 });
  const send = trpc.pediu.experience.chat.send.useMutation({ onSuccess: () => { setBody(""); messages.refetch(); } });
  return <Page title="Chat do pedido" eyebrow="ATENDIMENTO">
    <Card>
      <FlatList data={messages.data ?? []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <View style={{ marginBottom: 12 }}><Text style={s.muted}>{item.role === "customer" ? "Você" : item.role}</Text><Text style={s.body}>{item.body}</Text></View>} ListEmptyComponent={<Text style={s.muted}>Nenhuma mensagem ainda.</Text>} />
    </Card>
    <Card>
      <TextInput value={body} onChangeText={setBody} placeholder="Digite sua mensagem" multiline style={[s.input, { minHeight: 80 }]} />
      <PrimaryButton title={send.isPending ? "Enviando..." : "Enviar"} disabled={!body.trim() || send.isPending} onPress={() => send.mutate({ orderId: id, body: body.trim() })} />
    </Card>
  </Page>;
}
