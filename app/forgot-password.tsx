import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível trocar a senha.";
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const requestCode = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (result) => setNotice(result.message),
    onError: (error) => setNotice(messageOf(error)),
  });
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => router.replace("/login"),
  });

  return (
    <Page title="Nova senha" eyebrow="SEGURANÇA" back>
      <Card>
        <Text style={s.sectionTitle}>Esqueceu a senha?</Text>
        <Text style={s.muted}>
          Peça o código aqui. Se o envio de e-mail estiver ligado, tentamos mandar os 8 números. Se não estiver, o suporte do Pediu entrega o código. Ele vale 30 minutos.
        </Text>
        <Field label="E-mail da conta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <OutlineButton
          title={requestCode.isPending ? "Pedindo..." : "Pedir código"}
          disabled={requestCode.isPending || !email.includes("@")}
          onPress={() => requestCode.mutate({ email: email.trim() })}
        />
        {notice ? <Text style={{ color: PEDIU.ink, fontWeight: "700" }}>{notice}</Text> : null}
        <Field label="Código de 8 números" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} />
        <Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        {reset.isSuccess ? <Text style={{ color: PEDIU.ink, fontWeight: "700" }}>Senha trocada. Entre com a nova senha.</Text> : null}
        {reset.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(reset.error)}</Text> : null}
        <PrimaryButton
          title={reset.isPending ? "Trocando..." : "Trocar senha"}
          disabled={reset.isPending || code.trim().length !== 8 || password.length < 8}
          onPress={() =>
            reset.mutate({
              email: email.trim(),
              code: code.trim(),
              nextPassword: password,
            })
          }
        />
        <OutlineButton title="Voltar para entrar" onPress={() => router.replace("/login")} />
      </Card>
    </Page>
  );
}
