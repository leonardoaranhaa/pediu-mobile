import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível criar a conta.";
}

export default function RegisterScreen() {
  const { refresh } = useAuth({ autoFetch: false });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const signup = trpc.auth.signup.useMutation({
    onSuccess: async (result) => {
      await Auth.setSessionToken(result.token);
      await refresh();
      router.replace("/(tabs)");
    },
  });

  return (
    <Page title="Criar conta" eyebrow="COMECE AGORA" back={false}>
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
        <Text style={{ color: PEDIU.ink, fontSize: 19, fontWeight: "900" }}>Uma conta para pedir, vender e entregar</Text>
        <Text style={[s.muted, { textAlign: "center" }]}>Use seu e-mail e uma senha. A mesma conta serve para cliente, loja e motoboy.</Text>
      </View>
      <Card>
        <Text style={s.sectionTitle}>Cadastro</Text>
        <Field label="Nome" value={name} onChangeText={setName} autoComplete="name" />
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
        <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Senha (mínimo 8)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        {signup.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(signup.error)}</Text> : null}
        <PrimaryButton
          title={signup.isPending ? "Criando..." : "Criar conta"}
          disabled={signup.isPending || name.trim().length < 2 || password.length < 8}
          onPress={() =>
            signup.mutate({
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim() || undefined,
              password,
            })
          }
        />
        <OutlineButton title="Já tenho uma conta" onPress={() => router.push("/login")} />
      </Card>
    </Page>
  );
}
