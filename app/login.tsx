import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { isDevAuthEnabled, isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

function BrandMark() {
  return <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}><Text style={{ color: PEDIU.white, fontSize: 48, fontWeight: "900", fontStyle: "italic", lineHeight: 52 }}>p</Text></View>;
}

function DevLoginCard() {
  const [pending, setPending] = useState<"customer" | "merchant" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(persona: "customer" | "merchant") {
    setPending(persona);
    setError(null);
    try {
      const { sessionToken, user } = await Api.devLogin(persona);
      await Auth.setSessionToken(sessionToken);
      await Auth.setUserInfo({ ...user, lastSignedIn: new Date(user.lastSignedIn) });
      // useAuth is per-screen state, so web reloads to pick up the new session cookie everywhere.
      if (Platform.OS === "web" && typeof window !== "undefined") window.location.assign("/");
      else router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com a conta de teste.");
      setPending(null);
    }
  }

  return <Card>
    <Text style={s.sectionTitle}>Ambiente de desenvolvimento</Text>
    <Text style={s.muted}>Entre com as contas criadas por pnpm db:seed, sem provedor OAuth.</Text>
    <PrimaryButton title={pending === "customer" ? "Entrando..." : "Entrar como cliente de teste"} onPress={() => void signIn("customer")} disabled={pending !== null} />
    <OutlineButton title={pending === "merchant" ? "Entrando..." : "Entrar como lojista de teste"} onPress={() => void signIn("merchant")} disabled={pending !== null} />
    {error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{error}</Text> : null}
  </Card>;
}

function AppleLoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (Platform.OS !== "ios") return null;

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const AppleAuthentication = await import("expo-apple-authentication");
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) throw new Error("Sign in with Apple não está disponível neste aparelho.");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error("A Apple não devolveu um token de identidade.");
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
      const { sessionToken, user } = await Api.appleLogin(credential.identityToken, name || undefined);
      await Auth.setSessionToken(sessionToken);
      await Auth.setUserInfo({ ...user, lastSignedIn: new Date(user.lastSignedIn) });
      router.replace("/(tabs)");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ERR_REQUEST_CANCELED") {
        setPending(false);
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível entrar com a Apple.");
      setPending(false);
    }
  }

  return <Card>
    <Text style={s.sectionTitle}>Sign in with Apple</Text>
    <Text style={s.muted}>No iPhone, você também pode entrar com a Apple. A conta é criada na primeira vez.</Text>
    <PrimaryButton title={pending ? "Entrando..." : "Continuar com a Apple"} onPress={() => void signIn()} disabled={pending} />
    {error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{error}</Text> : null}
  </Card>;
}

export default function LoginScreen() {
  const loginAvailable = isOAuthConfigured;
  return <Page title="Entrar no Pediu" eyebrow="BEM-VINDO" back={false}>
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 18 }}>
      <BrandMark />
      <Text style={{ color: PEDIU.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 }}>Pediu</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 300 }]}>Peça, venda e acompanhe tudo em um só lugar.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>Login seguro</Text>
      <Text style={s.muted}>Entre com a autenticação segura do Pediu. Depois do acesso, você volta para o fluxo que estava usando.</Text>
      <PrimaryButton title={loginAvailable ? "Entrar com login seguro" : "Login indisponível no preview"} onPress={() => void startOAuthLogin()} disabled={!loginAvailable} />
      <OutlineButton title="Criar uma conta" onPress={() => router.push("/register")} />
      {!loginAvailable ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>O provedor de autenticação ainda não foi configurado neste ambiente.</Text> : null}
    </Card>
    <AppleLoginButton />
    {isDevAuthEnabled ? <DevLoginCard /> : null}
    <View style={{ backgroundColor: PEDIU.coralSoft, borderRadius: 18, padding: 15, flexDirection: "row", gap: 10 }}>
      <MaterialIcons name="lock" size={19} color={PEDIU.coral} />
      <Text style={[s.muted, { flex: 1 }]}>Sua sessão é tratada pelo fluxo de autenticação do aplicativo, sem expor credenciais na interface.</Text>
    </View>
  </Page>;
}
