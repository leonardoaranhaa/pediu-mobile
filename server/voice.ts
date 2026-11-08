import { AI_UNAVAILABLE, openAiChat, openAiConfigured } from "./_core/openai";

export type VoiceMode = "customer" | "seller";
export type VoiceAction = "doces" | "pedidos" | "loja" | "venda" | "fiado" | "catalogo" | "divulgar" | "fallback";

const ACTIONS_BY_MODE: Record<VoiceMode, VoiceAction[]> = {
  customer: ["doces", "pedidos", "loja"],
  seller: ["venda", "fiado", "catalogo", "divulgar"],
};

export async function interpretVoiceCommand(
  mode: VoiceMode,
  command: string,
  textModel = "gpt-5-mini",
) {
  const allowedActions = ACTIONS_BY_MODE[mode];
  if (!openAiConfigured()) {
    return {
      action: "fallback" as const,
      reply: AI_UNAVAILABLE,
    };
  }
  let content: string;
  try {
    content = await openAiChat({
    model: textModel,
    maxTokens: 300,
    messages: [
      { role: "system", content: `Você é o assistente do Pediu. Interprete o comando em português e escolha somente uma ação permitida. Modo: ${mode}. Ações permitidas: ${allowedActions.join(", ")}. Nunca invente ações, não confirme pagamentos e não execute operações financeiras. Se não houver correspondência, use fallback.` },
      { role: "user", content: command.slice(0, 500) },
    ],
    jsonSchema: {
        name: "pediu_voice_action",
        schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: [...allowedActions, "fallback"] },
            reply: { type: "string" },
          },
          required: ["action", "reply"],
          additionalProperties: false,
        },
    },
  });
  } catch {
    return {
      action: "fallback" as const,
      reply: "Não consegui entender agora. Escolha uma ação para continuar.",
    };
  }
  if (!content) return { action: "fallback" as const, reply: "Não consegui entender. Escolha uma ação para continuar." };
  try {
    const parsed = JSON.parse(content) as { action: VoiceAction; reply: string };
    if (!allowedActions.includes(parsed.action) && parsed.action !== "fallback") return { action: "fallback" as const, reply: "Essa ação ainda não está disponível." };
    return parsed;
  } catch {
    return { action: "fallback" as const, reply: "Não consegui interpretar o comando. Tente novamente." };
  }
}
