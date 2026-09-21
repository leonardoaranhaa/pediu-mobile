import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return <Page title="Recuperar acesso" eyebrow="SEGURANÇA" back>
    <Card>
      <Text style={s.sectionTitle}>{sent ? "Confira seu e-mail" : "Esqueceu sua senha?"}</Text>
      <Text style={s.muted}>{sent ? "Se houver uma conta para este e-mail, enviaremos as instruções de recuperação." : "Informe o e-mail da sua conta para receber as instruções de recuperação."}</Text>
      {!sent && <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="seu@email.com" style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text }} />}
      <PrimaryButton title={sent ? "Voltar para entrar" : "Enviar instruções"} onPress={() => sent ? router.replace("/login") : setSent(true)} disabled={!sent && !email.includes("@")} />
    </Card>
  </Page>;
}
