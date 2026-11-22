import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { Card, Field, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { userFacingError } from "@/lib/user-message";
import { trpc } from "@/lib/trpc";

export function DeleteAccount() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const closeAccount = trpc.pediu.account.profile.close.useMutation({
    onSuccess: async () => {
      await logout();
      router.replace("/(tabs)");
    },
  });

  const ask = () => {
    Alert.alert(
      "Excluir sua conta?",
      "A conta sai do Pediu e o e-mail pode ser usado numa conta nova. Pedidos antigos continuam no histórico, sem os seus dados. Para usar outro papel, crie uma conta nova.",
      [
        { text: "Manter conta", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => closeAccount.mutate({ password }),
        },
      ],
    );
  };

  if (!open) {
    return (
      <Text onPress={() => setOpen(true)} style={{ color: "#6E635A", fontWeight: "700", textAlign: "center", paddingVertical: 8 }}>
        Excluir minha conta
      </Text>
    );
  }

  return (
    <Card>
      <Text style={s.sectionTitle}>Excluir minha conta</Text>
      <Text style={s.muted}>
        A conta sai do Pediu. Pedidos antigos continuam no histórico, sem os seus dados.
      </Text>
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      {closeAccount.error ? (
        <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>
          {userFacingError(closeAccount.error)}
        </Text>
      ) : null}
      <PrimaryButton
        title={closeAccount.isPending ? "Excluindo..." : "Excluir minha conta"}
        disabled={closeAccount.isPending || password.length < 1}
        onPress={ask}
      />
    </Card>
  );
}
