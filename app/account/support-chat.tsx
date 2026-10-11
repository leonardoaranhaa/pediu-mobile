import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Page,
  Card,
  Field,
  PrimaryButton,
  OutlineButton,
  PEDIU,
  s,
} from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const statusLabel: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  resolved: "Resolvido",
  closed: "Encerrado",
};

/**
 * Chat de suporte da conta — mesma API de `app/support.tsx`.
 * Mensagens e tickets vivem no servidor (experience.support).
 */
export default function SupportChatPage() {
  const { isAuthenticated } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [messageKey, setMessageKey] = useState("");

  const tickets = trpc.pediu.experience.support.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const messages = trpc.pediu.experience.support.messages.list.useQuery(
    { ticketId: selectedTicketId ?? 0 },
    {
      enabled: isAuthenticated && selectedTicketId !== null,
      refetchInterval: selectedTicketId ? 5000 : false,
    },
  );
  const { mutateAsync: markReadAsync } =
    trpc.pediu.experience.support.messages.markRead.useMutation();
  const create = trpc.pediu.experience.support.create.useMutation({
    onSuccess: async (result) => {
      setSubject("");
      setBody("");
      setSelectedTicketId(result.ticketId);
      await tickets.refetch();
    },
  });
  const send = trpc.pediu.experience.support.messages.send.useMutation({
    onSuccess: async () => {
      setMessage("");
      setMessageKey("");
      await messages.refetch();
    },
  });

  useEffect(() => {
    if (selectedTicketId !== null && messages.data?.length) {
      void markReadAsync({ ticketId: selectedTicketId });
    }
  }, [selectedTicketId, messages.data?.length, markReadAsync]);

  if (!isAuthenticated) {
    return (
      <Page title="Falar com suporte" eyebrow="ATENDIMENTO">
        <Card>
          <Text style={s.sectionTitle}>Entre para abrir um chamado</Text>
          <Text style={s.muted}>
            O histórico de atendimento fica no servidor e exige sessão válida.
            Mensagens não são guardadas só neste aparelho.
          </Text>
          <PrimaryButton
            title="Entrar"
            onPress={() => router.push("/login")}
          />
        </Card>
      </Page>
    );
  }

  const sendMessage = async () => {
    if (selectedTicketId === null || message.trim().length < 1) return;
    const key =
      messageKey ||
      `support-${selectedTicketId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessageKey(key);
    await send.mutateAsync({
      ticketId: selectedTicketId,
      body: message.trim(),
      idempotencyKey: key,
    });
  };

  return (
    <Page title="Falar com suporte" eyebrow="ATENDIMENTO">
      <Card>
        <Text style={s.sectionTitle}>Novo chamado</Text>
        <Text style={s.muted}>
          Descreva o problema. O chamado e as respostas ficam salvos na sua
          conta.
        </Text>
        <Field
          label="ASSUNTO"
          value={subject}
          onChangeText={setSubject}
          placeholder="Ex.: problema com pagamento"
        />
        <Field
          label="MENSAGEM"
          value={body}
          onChangeText={setBody}
          placeholder="Descreva o que aconteceu"
          multiline
        />
        {create.error ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            {create.error.message}
          </Text>
        ) : null}
        <PrimaryButton
          title={create.isPending ? "Enviando..." : "Abrir chamado"}
          onPress={() =>
            create.mutate({
              subject: subject.trim(),
              body: body.trim(),
            })
          }
          disabled={
            create.isPending ||
            subject.trim().length < 3 ||
            body.trim().length < 10
          }
        />
        <OutlineButton
          title="Abrir tela completa de suporte"
          onPress={() => router.push("/support")}
        />
      </Card>

      <Card>
        <Text style={s.sectionTitle}>Seus chamados</Text>
        {tickets.isLoading ? (
          <Text style={s.muted}>Carregando...</Text>
        ) : null}
        {tickets.isError ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            Não foi possível carregar os chamados.
          </Text>
        ) : null}
        {!tickets.isLoading && !tickets.data?.length ? (
          <Text style={s.muted}>Você ainda não abriu um chamado.</Text>
        ) : null}
        {tickets.data?.map((ticket) => (
          <Pressable
            key={ticket.id}
            onPress={() => setSelectedTicketId(ticket.id)}
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor:
                selectedTicketId === ticket.id ? PEDIU.coral : PEDIU.line,
              backgroundColor:
                selectedTicketId === ticket.id ? PEDIU.peach : PEDIU.canvas,
            }}
          >
            <Text style={s.sectionTitle}>
              #{ticket.id} · {ticket.subject}
            </Text>
            <Text style={s.muted}>
              {statusLabel[ticket.status] ?? ticket.status}
            </Text>
          </Pressable>
        ))}
      </Card>

      {selectedTicketId !== null ? (
        <Card>
          <Text style={s.sectionTitle}>
            Conversa #{selectedTicketId}
          </Text>
          {messages.isLoading ? (
            <Text style={s.muted}>Carregando mensagens...</Text>
          ) : null}
          {messages.data?.map((item) => (
            <View
              key={item.id}
              style={{
                gap: 3,
                alignSelf:
                  item.role === "customer" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                backgroundColor:
                  item.role === "customer" ? PEDIU.coralSoft : PEDIU.canvas,
                borderRadius: 14,
                padding: 11,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: PEDIU.ink,
                  fontWeight: "900",
                  fontSize: 11,
                }}
              >
                {item.role === "admin" ? "Suporte" : "Você"}
              </Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.muted}>
                {new Date(item.createdAt).toLocaleString("pt-BR")}
              </Text>
            </View>
          ))}
          <Field
            label="RESPOSTA"
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setMessageKey("");
            }}
            placeholder="Escreva uma resposta"
            multiline
          />
          {send.error ? (
            <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
              {send.error.message}
            </Text>
          ) : null}
          <PrimaryButton
            title={send.isPending ? "Enviando..." : "Enviar resposta"}
            onPress={() => void sendMessage()}
            disabled={send.isPending || message.trim().length < 1}
          />
        </Card>
      ) : null}
    </Page>
  );
}
