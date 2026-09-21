import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Page, Card, PrimaryButton, s } from "@/components/pediu-page";

export default function MfaPage() {
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  return <Page title="Verificação de segurança" eyebrow="SEGURANÇA">
    <Card>
      <Text style={s.body}>Digite o código de 6 dígitos enviado para seu canal de segurança.</Text>
      <TextInput value={code} onChangeText={v => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" style={s.input} />
      <PrimaryButton title={verified ? "Verificado" : "Verificar código"} disabled={code.length !== 6 || verified} onPress={() => setVerified(true)} />
      {verified && <Text style={s.muted}>Verificação concluída.</Text>}
    </Card>
  </Page>;
}
