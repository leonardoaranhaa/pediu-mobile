import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { takeAuthReturn } from "@/lib/guest-access";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível entrar.";
}

export default function LoginScreen() {
  const { refresh } = useAuth({ autoFetch: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      await Auth.clearUserInfo();
      await Auth.setSessionToken(result.token);
      await refresh();
      router.replace(takeAuthReturn() as never);
    },
  });

  return (
    <Page title="Entrar no Pediu" eyebrow="BEM-VINDO" back={false}>
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}>
          <Text style={{ color: PEDIU.white, fontSize: 48, fontWeight: "900", fontStyle: "italic", lineHeight: 52 }}>p</Text>
        </View>
        <Text style={{ color: PEDIU.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 }}>Pediu</Text>
        <Text style={[s.muted, { textAlign: "center", maxWidth: 300 }]}>
          Entre com a conta que você criou. Cliente, loja e entregas são contas separadas.
        </Text>
      </View>
      <Card>
        <Text style={s.sectionTitle}>Entrar</Text>
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        {login.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(login.error)}</Text> : null}
        <PrimaryButton
          title={login.isPending ? "Entrando..." : "Entrar"}
          disabled={login.isPending || email.trim().length < 3 || password.length < 1}
          onPress={() => login.mutate({ email: email.trim(), password })}
        />
        <OutlineButton title="Criar uma conta" onPress={() => router.push("/register")} />
        <OutlineButton title="Esqueci a senha" onPress={() => router.push("/forgot-password")} />
      </Card>
      <View style={{ backgroundColor: PEDIU.coralSoft, borderRadius: 18, padding: 15, flexDirection: "row", gap: 10 }}>
        <MaterialIcons name="lock" size={19} color={PEDIU.coral} />
        <Text style={[s.muted, { flex: 1 }]}>Use uma senha que só você conhece. Neste celular guardamos o acesso, e você pode encerrá-lo quando sair.</Text>
      </View>
    </Page>
  );
}
