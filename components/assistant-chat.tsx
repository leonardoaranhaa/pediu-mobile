import { MaterialIcons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cartLineKey, type CartProduct } from "@/lib/cart";
import { useAppPreferences } from "@/lib/app-preferences";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";
import type {
  AssistantCard,
  AssistantClientAction,
  AssistantNavigation,
  AssistantPending,
  AssistantTurn,
} from "@/shared/assistant";
import { ASSISTANT_UNAVAILABLE } from "@/shared/assistant";

type Audience = "guest" | "customer" | "merchant" | "courier";

type Bubble = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
  pending?: AssistantPending | null;
  navigation?: AssistantNavigation;
};

const CHIPS: Record<Audience, string[]> = {
  guest: ["Buscar pizza", "Doces perto de mim"],
  customer: ["Quero uma pizza", "Ver meus pedidos", "O que tem na sacola?"],
  merchant: ["Pedidos de agora", "Pausar a loja", "Vendas de hoje"],
  courier: ["Ficar disponível", "Entregas para mim", "Quanto ganhei hoje?"],
};

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AssistantChat({
  audience,
  onClose,
  onNavigate,
}: {
  audience: Audience;
  onClose: () => void;
  onNavigate?: (target: AssistantNavigation) => void;
}) {
  const { theme } = useAppPreferences();
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const chat = trpc.pediu.assistant.chat.useMutation();
  const confirm = trpc.pediu.assistant.confirm.useMutation();
  const cancel = trpc.pediu.assistant.cancel.useMutation();
  const transcribe = trpc.pediu.voice.transcribe.useMutation();
  const [draft, setDraft] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      id: "hello",
      role: "assistant",
      text:
        audience === "merchant"
          ? "Posso cuidar dos pedidos, da loja e das vendas. O que você precisa?"
          : audience === "courier"
            ? "Posso mostrar as entregas e o que você ganhou hoje."
            : audience === "guest"
              ? "Posso buscar lojas e produtos. Para pedir, entre na sua conta."
              : "Pode falar o que quer pedir. Eu monto a sacola com você.",
    },
  ]);
  const scrollRef = useRef<ScrollView>(null);
  const busy = chat.isPending || confirm.isPending || transcribe.isPending;

  const cartPayload = useMemo(
    () =>
      cart.items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        optionIds: item.options?.map((option) => option.id),
        note: item.note,
      })),
    [cart.items],
  );

  const applyActions = (actions: AssistantClientAction[]) => {
    for (const action of actions) {
      if (action.type === "add") {
        const result = cart.addItem(action.product as CartProduct, action.quantity);
        if (!result.ok && result.error) {
          setBubbles((current) => [
            ...current,
            { id: nextId(), role: "assistant", text: result.error ?? "Não consegui atualizar a sacola." },
          ]);
        }
      } else if (action.type === "remove") {
        cart.removeItem(cartLineKey({ id: action.productId, options: (action.optionIds ?? []).map((id) => ({ id, groupId: 0, groupName: "", name: "", priceDelta: "0" })) }));
      } else if (action.quantity <= 0) {
        cart.removeItem(cartLineKey({ id: action.productId, options: (action.optionIds ?? []).map((id) => ({ id, groupId: 0, groupName: "", name: "", priceDelta: "0" })) }));
      } else {
        cart.updateQuantity(
          cartLineKey({ id: action.productId, options: (action.optionIds ?? []).map((id) => ({ id, groupId: 0, groupName: "", name: "", priceDelta: "0" })) }),
          action.quantity,
        );
      }
    }
  };

  const follow = (target?: AssistantNavigation) => {
    if (!target) return;
    if (onNavigate) {
      onNavigate(target);
      return;
    }
    if (target.screen === "track" && target.orderId) {
      router.push({ pathname: "/order/track", params: { orderId: String(target.orderId) } });
    }
    if (target.screen === "courier") router.push("/courier");
  };

  const showTurn = (turn: AssistantTurn) => {
    applyActions(turn.clientActions ?? []);
    setBubbles((current) => [
      ...current,
      {
        id: nextId(),
        role: "assistant",
        text: turn.reply || ASSISTANT_UNAVAILABLE,
        cards: turn.cards,
        pending: turn.pendingConfirmation,
        navigation: turn.navigation,
      },
    ]);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const mine: Bubble = { id: nextId(), role: "user", text: content };
    const history = [...bubbles, mine]
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.text }));
    setBubbles((current) => [...current, mine]);
    setDraft("");
    try {
      const turn = await chat.mutateAsync({ messages: history, cart: cartPayload });
      showTurn(turn);
    } catch {
      setBubbles((current) => [
        ...current,
        { id: nextId(), role: "assistant", text: ASSISTANT_UNAVAILABLE },
      ]);
    }
  };

  const onConfirm = async (pending: AssistantPending) => {
    try {
      const turn = await confirm.mutateAsync({ token: pending.token, cart: cartPayload });
      showTurn(turn);
    } catch {
      setBubbles((current) => [
        ...current,
        { id: nextId(), role: "assistant", text: "Não consegui confirmar agora. Tente de novo." },
      ]);
    }
  };

  const onCancel = async (pending: AssistantPending) => {
    try {
      const turn = await cancel.mutateAsync({ token: pending.token });
      showTurn(turn);
    } catch {
      setBubbles((current) => [
        ...current,
        { id: nextId(), role: "assistant", text: "Nada foi alterado." },
      ]);
    }
  };

  const toggleMic = async () => {
    if (Platform.OS === "web") {
      const recognitionConstructor =
        (globalThis as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ||
        (globalThis as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
      if (!recognitionConstructor) {
        setBubbles((current) => [
          ...current,
          { id: nextId(), role: "assistant", text: "Neste aparelho, escreva o que você precisa." },
        ]);
        return;
      }
      const recognition = new recognitionConstructor();
      recognition.lang = "pt-BR";
      recognition.onresult = (event: { results?: Array<Array<{ transcript?: string }>> }) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) void send(transcript);
      };
      recognition.start();
      return;
    }
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      try {
        const audioBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const heard = await transcribe.mutateAsync({ audioBase64, mimeType: "audio/m4a" });
        await send(heard.text);
      } catch {
        setBubbles((current) => [
          ...current,
          { id: nextId(), role: "assistant", text: "Não consegui ouvir. Pode escrever?" },
        ]);
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setBubbles((current) => [
        ...current,
        { id: nextId(), role: "assistant", text: "Permita o microfone para falar com o Pediu." },
      ]);
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.backdrop, { paddingTop: Math.max(insets.top, 12) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: theme.primary }]}>PEDIU</Text>
            <Text style={[styles.title, { color: theme.ink }]}>Fale com o Pediu</Text>
          </View>
          <Pressable accessibilityLabel="Fechar assistente" onPress={onClose} hitSlop={10}>
            <MaterialIcons name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {bubbles.map((bubble) => (
            <View
              key={bubble.id}
              style={[
                styles.bubble,
                bubble.role === "user"
                  ? { backgroundColor: theme.primary, alignSelf: "flex-end" }
                  : { backgroundColor: theme.canvas, alignSelf: "flex-start", borderColor: theme.line, borderWidth: 1 },
              ]}
            >
              <Text style={{ color: bubble.role === "user" ? "#FFFFFF" : theme.ink, fontSize: 16, lineHeight: 22 }}>
                {bubble.text}
              </Text>
              {bubble.cards?.map((card) => (
                <View key={`${bubble.id}-${card.title}-${card.amount ?? ""}`} style={[styles.card, { borderColor: theme.line }]}>
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>{card.title}</Text>
                  {card.subtitle ? <Text style={{ color: theme.muted }}>{card.subtitle}</Text> : null}
                  <View style={styles.cardMeta}>
                    {card.amount ? <Text style={{ color: theme.ink, fontWeight: "700" }}>{card.amount}</Text> : null}
                    {card.badge ? <Text style={{ color: theme.primary }}>{card.badge}</Text> : null}
                  </View>
                </View>
              ))}
              {bubble.pending ? (
                <View style={styles.confirmRow}>
                  <Pressable
                    accessibilityLabel="Confirmar"
                    style={[styles.confirm, { backgroundColor: theme.primary }]}
                    disabled={busy}
                    onPress={() => void onConfirm(bubble.pending!)}
                  >
                    <Text style={styles.confirmText}>Confirmar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Cancelar"
                    style={[styles.confirm, { backgroundColor: theme.canvas, borderWidth: 1, borderColor: theme.line }]}
                    disabled={busy}
                    onPress={() => void onCancel(bubble.pending!)}
                  >
                    <Text style={{ color: theme.ink, fontWeight: "700" }}>Cancelar</Text>
                  </Pressable>
                </View>
              ) : null}
              {bubble.navigation ? (
                <Pressable onPress={() => follow(bubble.navigation)}>
                  <Text style={{ color: theme.primary, marginTop: 8, fontWeight: "700" }}>{bubble.navigation.label}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS[audience].map((chip) => (
            <Pressable key={chip} style={[styles.chip, { borderColor: theme.line, backgroundColor: theme.canvas }]} onPress={() => void send(chip)} disabled={busy}>
              <Text style={{ color: theme.ink }}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={[styles.composer, { borderColor: theme.line, backgroundColor: theme.canvas }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreva aqui"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.ink }]}
            editable={!busy}
            onSubmitEditing={() => void send(draft)}
            returnKeyType="send"
          />
          <Pressable accessibilityLabel="Ativar microfone" style={[styles.send, { backgroundColor: recorderState.isRecording ? theme.ink : theme.primary }]} onPress={() => void toggleMic()} disabled={busy && !recorderState.isRecording}>
            <MaterialIcons name={recorderState.isRecording ? "stop" : "mic"} size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityLabel="Enviar" style={[styles.send, { backgroundColor: theme.primary }]} onPress={() => void send(draft)} disabled={busy || !draft.trim()}>
            <MaterialIcons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.35)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", minHeight: "72%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 22, fontWeight: "800" },
  thread: { gap: 10, paddingVertical: 8 },
  bubble: { maxWidth: "88%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 2, backgroundColor: "#FFFFFF" },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  confirmRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  confirm: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  confirmText: { color: "#FFFFFF", fontWeight: "800" },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 22, padding: 6 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 8, minHeight: 40 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
