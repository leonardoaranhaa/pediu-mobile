import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

export default function SupportScreen() {
  const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [sent, setSent] = useState(false);
  return <Page title="Falar com suporte" eyebrow="ATENDIMENTO" back>
    <Card>
      <Text style={s.sectionTitle}>{sent ? "Solicitação recebida" : "Abra uma solicitação"}</Text>
      <Text style={s.muted}>{sent ? "O atendimento poderá continuar por este chamado quando o backend de suporte estiver conectado." : "Descreva o problema e inclua o número do pedido quando aplicável."}</Text>
      {!sent && <><TextInput value={subject} onChangeText={setSubject} placeholder="Assunto" style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text }} /><TextInput value={message} onChangeText={setMessage} placeholder="Descreva o que aconteceu" multiline style={{ minHeight: 140, borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text, textAlignVertical: "top" }} /></>}
      <PrimaryButton title={sent ? "Voltar" : "Enviar solicitação"} onPress={() => sent ? undefined : setSent(true)} disabled={!sent && (!subject.trim() || !message.trim())} />
    </Card>
  </Page>;
}
