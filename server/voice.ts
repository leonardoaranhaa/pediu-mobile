import { invokeLLM } from "./_core/llm";

export type VoiceMode = "customer" | "seller";
export type VoiceAction = "doces" | "pedidos" | "loja" | "venda" | "fiado" | "catalogo" | "divulgar" | "fallback";

const ACTIONS_BY_MODE: Record<VoiceMode, VoiceAction[]> = {
  customer: ["doces", "pedidos", "loja"],
  seller: ["venda", "fiado", "catalogo", "divulgar"],
};

export async function interpretVoiceCommand(mode: VoiceMode, command: string) {
  const allowedActions = ACTIONS_BY_MODE[mode];
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: `Você é o assistente do Pediu. Interprete o comando em português e escolha somente uma ação permitida. Modo: ${mode}. Ações permitidas: ${allowedActions.join(", ")}. Nunca invente ações, não confirme pagamentos e não execute operações financeiras. Se não houver correspondência, use fallback.` },
      { role: "user", content: command.slice(0, 500) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pediu_voice_action",
        strict: true,
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
    },
    reasoning: { effort: "minimal" },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") return { action: "fallback" as const, reply: "Não consegui entender. Escolha uma ação para continuar." };
  try {
    const parsed = JSON.parse(content) as { action: VoiceAction; reply: string };
    if (!allowedActions.includes(parsed.action) && parsed.action !== "fallback") return { action: "fallback" as const, reply: "Essa ação ainda não está disponível no MVP." };
    return parsed;
  } catch {
    return { action: "fallback" as const, reply: "Não consegui interpretar o comando. Tente novamente." };
  }
}
