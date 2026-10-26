import type { AssistantAudience, AssistantCartLine, AssistantTurn } from "../shared/assistant";
import { ASSISTANT_UNAVAILABLE } from "../shared/assistant";
import { openAiConfigured, openAiToolStep } from "./_core/openai";
import {
  commitAssistantAction,
  performAssistantTool,
  type AssistantActor,
  type AssistantContext,
} from "./assistant-actions";
import {
  saveAssistantConfirmation,
  takeAssistantConfirmation,
} from "./assistant-confirmations";
import { toolsForAudience } from "./assistant-tools";
import * as db from "./db";
import { isAdminEmail } from "./_core/env";

const ROLE_LABEL: Record<AssistantAudience, string> = {
  guest: "visitante",
  customer: "cliente",
  merchant: "lojista",
  courier: "motoboy",
};

function systemPrompt(audience: AssistantAudience, cart: AssistantCartLine[]) {
  const bag = cart.length
    ? cart
        .map((line) => `${line.quantity} do produto ${line.productId}`)
        .join(", ")
    : "vazia";
  return [
    "Você é o assistente do Pediu. Fale pouco, em português simples do Brasil.",
    `A pessoa está como ${ROLE_LABEL[audience]}. Só faça o que esse papel pode fazer.`,
    "Não invente loja, preço, pedido, saldo ou entrega. Use só o que as ferramentas devolverem.",
    "Para produto, loja, pedido ou entrega, use somente os números do campo refs. Não chute esses números.",
    "Se faltar um detalhe, faça uma pergunta curta.",
    "Nunca peça número de cartão, validade ou código de segurança.",
    "Quando uma ferramenta disser que está aguardando confirmação, avise a pessoa para tocar em Confirmar. Não diga que a ação já foi feita e não confirme no lugar dela.",
    "Se a pessoa escrever que confirma, peça para tocar no botão. Não chame a ferramenta de novo.",
    `Sacola atual: ${bag}.`,
  ].join(" ");
}

export async function resolveAssistantAudience(user: AssistantActor | null): Promise<AssistantAudience> {
  if (!user) return "guest";
  if (user.role === "admin" || isAdminEmail(user.email ?? "")) {
    const roles = await db.listAccountRoles(user.id, user.role);
    if (roles.includes("merchant")) return "merchant";
    if (roles.includes("courier")) return "courier";
    if (roles.includes("customer")) return "customer";
    return "guest";
  }
  const roles = await db.listAccountRoles(user.id, user.role);
  if (roles.includes("merchant")) return "merchant";
  if (roles.includes("courier")) return "courier";
  if (roles.includes("customer")) return "customer";
  return "guest";
}

function blankTurn(reply: string): AssistantTurn {
  return { reply, cards: [], clientActions: [] };
}

export async function runAssistantChat(input: {
  user: AssistantActor | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  cart: AssistantCartLine[];
  req?: unknown;
  res?: unknown;
}): Promise<AssistantTurn> {
  const audience = await resolveAssistantAudience(input.user);
  if (!openAiConfigured()) return blankTurn(ASSISTANT_UNAVAILABLE);
  const settings = await db.getPlatformSettings().catch(() => null);
  const model = settings?.textModel?.trim() || "gpt-5-mini";
  const tools = toolsForAudience(audience).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
  const history = input.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1000),
    }));
  if (!history.length || history[history.length - 1]?.role !== "user") {
    return blankTurn("Escreva o que você precisa.");
  }
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt(audience, input.cart) },
    ...history,
  ];
  const ctx: AssistantContext = {
    user: input.user,
    audience,
    cart: input.cart,
    req: input.req,
    res: input.res,
  };
  const turn = blankTurn("");
  for (let step = 0; step < 6; step += 1) {
    const response = await openAiToolStep({ model, messages, tools });
    const calls = response.toolCalls ?? [];
    if (!calls.length) {
      turn.reply = response.content?.trim() || "Pode repetir de outro jeito?";
      return turn;
    }
    messages.push({
      role: "assistant",
      content: response.content,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.arguments },
      })),
    });
    for (const call of calls) {
      let parsed: unknown = {};
      try {
        parsed = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        parsed = {};
      }
      const effect = await performAssistantTool(call.name, parsed, ctx);
      if (effect.cards.length) turn.cards = effect.cards;
      if (effect.clientActions.length) turn.clientActions.push(...effect.clientActions);
      if (effect.navigation) turn.navigation = effect.navigation;
      let toolText = effect.text;
      if (effect.pending && input.user) {
        const saved = await saveAssistantConfirmation({
          userId: input.user.id,
          tool: effect.pending.tool,
          payload: effect.pending.payload,
          summary: effect.pending.summary,
        });
        turn.pendingConfirmation = saved;
        toolText = `${effect.text} Aguardando a pessoa tocar em Confirmar. Não diga que já foi feito.`;
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({
          text: toolText,
          cards: effect.cards,
          ...(effect.refs?.length ? { refs: effect.refs } : {}),
        }).slice(0, 4000),
      });
      if (effect.pending) {
        turn.reply = effect.text;
        return turn;
      }
    }
  }
  turn.reply = turn.reply || "Pode repetir em uma frase mais curta?";
  return turn;
}

export async function confirmAssistantTurn(input: {
  user: AssistantActor;
  token: string;
  audience?: AssistantAudience;
  cart: AssistantCartLine[];
  req?: unknown;
  res?: unknown;
  consume?: boolean;
}): Promise<AssistantTurn> {
  const audience = input.audience ?? (await resolveAssistantAudience(input.user));
  const taken = await takeAssistantConfirmation({
    token: input.token,
    userId: input.user.id,
    consume: input.consume !== false,
  });
  if (!taken.ok) {
    const reply =
      taken.reason === "expired"
        ? "Essa confirmação venceu. Peça de novo."
        : taken.reason === "used"
          ? "Essa confirmação já foi usada."
          : "Não encontrei essa confirmação.";
    return blankTurn(reply);
  }
  if (input.consume === false) return blankTurn(taken.confirmation.summary);
  const effect = await commitAssistantAction(taken.confirmation.tool, taken.confirmation.payload, {
    user: input.user,
    audience,
    cart: input.cart,
    req: input.req,
    res: input.res,
  });
  return {
    reply: effect.text,
    cards: effect.cards,
    clientActions: effect.clientActions,
    navigation: effect.navigation,
  };
}

export async function cancelAssistantTurn(input: { user: AssistantActor; token: string }) {
  const taken = await takeAssistantConfirmation({
    token: input.token,
    userId: input.user.id,
  });
  if (!taken.ok && taken.reason !== "used") {
    return blankTurn("Nada foi alterado.");
  }
  return blankTurn("Cancelei. Nada foi alterado.");
}
