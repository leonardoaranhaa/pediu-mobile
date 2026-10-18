import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível trocar a senha.";
}

export default function ChangePasswordScreen() {
  const { refresh } = useAuth({ autoFetch: false });
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: async (result) => {
      await Auth.clearUserInfo();
      await Auth.setSessionToken(result.token);
      await refresh();
      router.back();
    },
  });

  return (
    <Page title="Trocar senha" eyebrow="CONTA" back>
      <Card>
        <Text style={s.sectionTitle}>Senha desta conta</Text>
        <Text style={s.muted}>Ao trocar, as outras sessões deixam de valer. Este aparelho continua conectado.</Text>
        <Field label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
        <Field label="Nova senha" value={nextPassword} onChangeText={setNextPassword} secureTextEntry autoCapitalize="none" />
        {change.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(change.error)}</Text> : null}
        <PrimaryButton
          title={change.isPending ? "Salvando..." : "Salvar nova senha"}
          disabled={change.isPending || nextPassword.length < 8}
          onPress={() => change.mutate({ currentPassword, nextPassword })}
        />
        <OutlineButton title="Voltar" onPress={() => router.back()} />
      </Card>
    </Page>
  );
}
