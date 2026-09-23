import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        let code = params.code ?? null;
        let state = params.state ?? null;
        let error = params.error ?? null;

        if (!code && !state && !error) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            const url = new URL(initialUrl);
            code = url.searchParams.get("code");
            state = url.searchParams.get("state");
            error = url.searchParams.get("error");
          }
        }

        if (error) {
          setStatus("error");
          setErrorMessage("O provedor de autenticação recusou o login.");
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setErrorMessage("Resposta OAuth incompleta. Tente entrar novamente.");
          return;
        }

        const result = await Api.exchangeOAuthCode(code, state);
        if (!result.sessionToken) throw new Error("Sessão não recebida do provedor");
        await Auth.setSessionToken(result.sessionToken);

        if (result.user) {
          await Auth.setUserInfo({
            id: result.user.id,
            openId: result.user.openId,
            name: result.user.name,
            email: result.user.email,
            loginMethod: result.user.loginMethod,
            role: result.user.role ?? "user",
            themePreference: result.user.themePreference,
            lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
          });
        }

        setStatus("success");
        setTimeout(() => router.replace("/(tabs)"), 700);
      } catch {
        setStatus("error");
        setErrorMessage("Não foi possível concluir o login. Tente novamente.");
      }
    };

    void handleCallback();
  }, [params.code, params.state, params.error, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">Concluindo autenticação...</Text>
          </>
        )}
        {status === "success" && (
          <Text className="text-base leading-6 text-center text-foreground">Login concluído. Redirecionando...</Text>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">Falha no login</Text>
            <Text className="text-base leading-6 text-center text-foreground">{errorMessage}</Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
