import type { AssistantAudience, AssistantCartLine, AssistantCard, AssistantTurn } from "../shared/assistant";
import { ASSISTANT_UNAVAILABLE, assistantTextForUser, stripAssistantTokens } from "../shared/assistant";
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
        .map((line) => {
          const name = line.name?.trim() || "item";
          const store = line.storeName?.trim();
          return store ? `${line.quantity} ${name} da ${store}` : `${line.quantity} ${name}`;
        })
        .join(", ")
    : "vazia";
  return [
    "Você é o assistente do Pediu. Fale pouco, em português simples do Brasil.",
    `A pessoa está como ${ROLE_LABEL[audience]}. Só faça o que esse papel pode fazer.`,
    "Não invente loja, preço, pedido, saldo ou entrega. Use só o que as ferramentas devolverem.",
    "Fale o nome da loja e do produto. Nunca escreva código interno e nunca peça um número de loja ou de produto.",
    "Se pedirem lojas ou lojas abertas, use search_stores. O resultado são lojas, não produtos.",
    "Se pedirem para colocar algo na sacola sem dizer o item, chame view_menu ou add_to_cart com o nome da loja e pergunte o nome do item.",
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

function modelPayload(text: string, cards: AssistantCard[], refs: Array<Record<string, unknown>> | undefined) {
  const itens = (refs ?? [])
    .map((ref) => {
      const item: Record<string, unknown> = {};
      if (ref.name) item.nome = ref.name;
      if (ref.storeName) item.loja = ref.storeName;
      if (ref.options) item.opcoes = ref.options;
      if (typeof ref.open === "boolean") item.aberta = ref.open;
      if (typeof ref.available === "boolean") item.disponivel = ref.available;
      if (ref.orderId) item.pedido = ref.orderId;
      if (ref.offerId) item.oferta = ref.offerId;
      return item;
    })
    .filter((item) => Object.keys(item).length > 0);
  return JSON.stringify({
    text,
    cards: cards.map((card) => ({
      title: card.title,
      subtitle: card.subtitle,
      amount: card.amount,
      badge: card.badge,
    })),
    ...(itens.length ? { itens } : {}),
  }).slice(0, 4000);
}

function presentTurn(turn: AssistantTurn): AssistantTurn {
  return {
    reply: assistantTextForUser(turn.reply),
    cards: turn.cards
      .map((card) => ({
        ...card,
        title: stripAssistantTokens(card.title),
        subtitle: card.subtitle ? stripAssistantTokens(card.subtitle) : undefined,
        amount: card.amount ? stripAssistantTokens(card.amount) : undefined,
        badge: card.badge ? stripAssistantTokens(card.badge) : undefined,
      }))
      .filter((card) => card.title),
    clientActions: turn.clientActions,
    navigation: turn.navigation
      ? { ...turn.navigation, label: assistantTextForUser(turn.navigation.label) }
      : undefined,
    pendingConfirmation: turn.pendingConfirmation
      ? { ...turn.pendingConfirmation, summary: assistantTextForUser(turn.pendingConfirmation.summary) }
      : turn.pendingConfirmation,
  };
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
  if (!openAiConfigured()) return presentTurn(blankTurn(ASSISTANT_UNAVAILABLE));
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
    return presentTurn(blankTurn("Escreva o que você precisa."));
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
      return presentTurn(turn);
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
        content: modelPayload(toolText, effect.cards, effect.refs),
      });
      if (effect.pending) {
        turn.reply = effect.text;
        return presentTurn(turn);
      }
    }
  }
  turn.reply = turn.reply || "Pode repetir em uma frase mais curta?";
  return presentTurn(turn);
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
    return presentTurn(blankTurn(reply));
  }
  if (input.consume === false) return presentTurn(blankTurn(taken.confirmation.summary));
  const effect = await commitAssistantAction(taken.confirmation.tool, taken.confirmation.payload, {
    user: input.user,
    audience,
    cart: input.cart,
    req: input.req,
    res: input.res,
  });
  return presentTurn({
    reply: effect.text,
    cards: effect.cards,
    clientActions: effect.clientActions,
    navigation: effect.navigation,
  });
}

export async function cancelAssistantTurn(input: { user: AssistantActor; token: string }) {
  const taken = await takeAssistantConfirmation({
    token: input.token,
    userId: input.user.id,
  });
  if (!taken.ok && taken.reason !== "used") {
    return presentTurn(blankTurn("Nada foi alterado."));
  }
  return presentTurn(blankTurn("Cancelei. Nada foi alterado."));
}
