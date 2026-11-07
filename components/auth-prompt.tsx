import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { edgeModalProps } from "@/components/edge-modal";
import { OutlineButton, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { bottomSafeInset } from "@/lib/screen-space";
import {
  clearAuthIntent,
  peekAuthIntent,
  setAuthIntent,
  type AccountAction,
  type SignupRole,
} from "@/lib/guest-access";

let openPrompt: ((open: boolean) => void) | null = null;

export function askToJoin(input?: { action?: AccountAction; role?: SignupRole; returnTo?: string }) {
  setAuthIntent({
    action: input?.action ?? "account",
    role: input?.role,
    returnTo: input?.returnTo ?? "/(tabs)",
  });
  openPrompt?.(true);
}

export function AuthPromptHost() {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    openPrompt = setVisible;
    return () => {
      if (openPrompt === setVisible) openPrompt = null;
    };
  }, []);
  const intent = peekAuthIntent();
  const title =
    intent?.role === "merchant"
      ? "Para vender, crie sua conta"
      : intent?.role === "courier"
        ? "Para entregar, crie sua conta"
        : "Para continuar, entre no Pediu";
  const body =
    intent?.role === "merchant"
      ? "Escolha a conta de lojista. Em seguida você cadastra a loja."
      : intent?.role === "courier"
        ? "Escolha a conta de motoboy. Em seguida você informa o veículo."
        : "Olhar as lojas é livre. Pedir, favoritar e acompanhar pedidos pede uma conta.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
      {...edgeModalProps}
    >
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,17,17,0.45)" }}>
        <View
          style={{
            backgroundColor: PEDIU.white,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: bottomSafeInset(insets.bottom, Platform.OS),
            gap: 12,
          }}
        >
          <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>{title}</Text>
          <Text style={s.muted}>{body}</Text>
          <PrimaryButton
            title="Criar conta"
            onPress={() => {
              setVisible(false);
              router.push("/register");
            }}
          />
          <OutlineButton
            title="Já tenho conta"
            onPress={() => {
              setVisible(false);
              router.push("/login");
            }}
          />
          <OutlineButton
            title="Agora não"
            onPress={() => {
              clearAuthIntent();
              setVisible(false);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
