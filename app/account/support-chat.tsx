import { useState } from "react";
import { FlatList, Text, TextInput } from "react-native";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function SupportChatPage() {
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<{id: number; body: string}[]>([]);
  return <Page title="Falar com suporte" eyebrow="ATENDIMENTO">
    <Card>
      <FlatList data={messages} keyExtractor={item => String(item.id)} renderItem={({item}) => <Text style={s.body}>{item.body}</Text>} ListEmptyComponent={<Text style={s.muted}>Como podemos ajudar?</Text>} />
    </Card>
    <Card>
      <TextInput value={body} onChangeText={setBody} placeholder="Descreva o que aconteceu" multiline style={[s.input, {minHeight: 90}]} />
      <PrimaryButton title="Enviar" disabled={!body.trim()} onPress={() => { setMessages(v => [...v, {id: Date.now(), body: body.trim()}]); setBody(""); }} />
    </Card>
  </Page>;
}
