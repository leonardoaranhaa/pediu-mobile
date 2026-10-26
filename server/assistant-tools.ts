import type { AssistantAudience } from "../shared/assistant";

export type AssistantToolSpec = {
  name: string;
  audiences: AssistantAudience[];
  confirm: boolean;
  description: string;
  parameters: Record<string, unknown>;
};

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const text = { type: "string" };
const positive = { type: "integer", minimum: 1 };

export const ASSISTANT_TOOLS: AssistantToolSpec[] = [
  {
    name: "search_catalog",
    audiences: ["guest", "customer"],
    confirm: false,
    description: "Busca lojas e produtos pelo nome ou categoria. Use openNow quando a pessoa quiser só o que está aberto.",
    parameters: object({
      query: text,
      category: text,
      openNow: { type: "boolean" },
    }),
  },
  {
    name: "view_menu",
    audiences: ["guest", "customer"],
    confirm: false,
    description: "Mostra o cardápio de uma loja já encontrada na busca. Use o storeId devolvido pela busca.",
    parameters: object({ storeId: positive }, ["storeId"]),
  },
  {
    name: "add_to_cart",
    audiences: ["customer"],
    confirm: false,
    description: "Coloca um produto na sacola, com tamanho ou opção quando existir. A quantidade é um número inteiro.",
    parameters: object({
      productId: positive,
      quantity: positive,
      optionNames: { type: "array", items: text },
    }, ["productId", "quantity"]),
  },
  {
    name: "remove_from_cart",
    audiences: ["customer"],
    confirm: false,
    description: "Tira um item da sacola atual.",
    parameters: object({ productId: positive, optionIds: { type: "array", items: positive } }, ["productId"]),
  },
  {
    name: "view_cart",
    audiences: ["customer"],
    confirm: false,
    description: "Mostra a sacola atual e o total.",
    parameters: object({}),
  },
  {
    name: "place_order",
    audiences: ["customer"],
    confirm: true,
    description: "Prepara o pedido da sacola. Não fecha o pedido: a pessoa confirma na tela. paymentMethod: pix, cash, fiado, card_credit ou card_debit.",
    parameters: object({
      paymentMethod: { type: "string", enum: ["pix", "cash", "fiado", "card_credit", "card_debit"] },
      addressId: positive,
      fulfillmentMode: { type: "string", enum: ["delivery", "pickup"] },
    }, ["paymentMethod"]),
  },
  {
    name: "list_my_orders",
    audiences: ["customer"],
    confirm: false,
    description: "Lista os pedidos desta conta e o status de cada um.",
    parameters: object({}),
  },
  {
    name: "repeat_last_order",
    audiences: ["customer"],
    confirm: true,
    description: "Prepara a repetição do último pedido. Não envia: a pessoa confirma na tela.",
    parameters: object({}),
  },
  {
    name: "cancel_order",
    audiences: ["customer"],
    confirm: true,
    description: "Prepara o cancelamento de um pedido desta conta que ainda pode ser cancelado. Não cancela sozinho.",
    parameters: object({ orderId: positive }, ["orderId"]),
  },
  {
    name: "pause_store",
    audiences: ["merchant"],
    confirm: false,
    description: "Pausa a loja desta conta. minutes pode ser 15, 30 ou 60. Sem minutes, pausa até a pessoa reabrir.",
    parameters: object({ minutes: { type: "integer", enum: [15, 30, 60] } }),
  },
  {
    name: "reopen_store",
    audiences: ["merchant"],
    confirm: false,
    description: "Reabre a loja desta conta.",
    parameters: object({}),
  },
  {
    name: "set_product_availability",
    audiences: ["merchant"],
    confirm: false,
    description: "Marca um produto da própria loja como esgotado ou disponível.",
    parameters: object({
      productId: positive,
      productName: text,
      available: { type: "boolean" },
    }, ["available"]),
  },
  {
    name: "change_product_price",
    audiences: ["merchant"],
    confirm: true,
    description: "Prepara a mudança de preço de um produto da própria loja. Não altera sozinho. price no formato 12.50.",
    parameters: object({
      productId: positive,
      productName: text,
      price: text,
    }, ["price"]),
  },
  {
    name: "list_store_orders",
    audiences: ["merchant"],
    confirm: false,
    description: "Lista pedidos pendentes e em preparo da própria loja.",
    parameters: object({}),
  },
  {
    name: "accept_order",
    audiences: ["merchant"],
    confirm: false,
    description: "Aceita um pedido pendente da própria loja.",
    parameters: object({ orderId: positive }, ["orderId"]),
  },
  {
    name: "refuse_order",
    audiences: ["merchant"],
    confirm: true,
    description: "Prepara a recusa de um pedido da própria loja. Não recusa sozinho.",
    parameters: object({ orderId: positive }, ["orderId"]),
  },
  {
    name: "mark_order_ready",
    audiences: ["merchant"],
    confirm: false,
    description: "Marca um pedido da própria loja como pronto.",
    parameters: object({ orderId: positive }, ["orderId"]),
  },
  {
    name: "register_sale",
    audiences: ["merchant"],
    confirm: true,
    description: "Prepara o registro de uma venda em dinheiro, PIX ou fiado. Não registra sozinho. Para fiado, informe o nome do cliente da loja.",
    parameters: object({
      total: text,
      paymentMethod: { type: "string", enum: ["cash", "pix", "fiado"] },
      customerName: text,
    }, ["total", "paymentMethod"]),
  },
  {
    name: "list_fiado",
    audiences: ["merchant"],
    confirm: false,
    description: "Mostra quem está devendo fiado nesta loja.",
    parameters: object({}),
  },
  {
    name: "sales_today",
    audiences: ["merchant"],
    confirm: false,
    description: "Resume as vendas de hoje desta loja.",
    parameters: object({}),
  },
  {
    name: "ad_credits",
    audiences: ["merchant"],
    confirm: false,
    description: "Mostra quantos créditos de anúncio a loja ainda tem.",
    parameters: object({}),
  },
  {
    name: "generate_ad",
    audiences: ["merchant"],
    confirm: true,
    description: "Prepara um anúncio com imagem para um produto da loja. Gasta 1 crédito e não gera sozinho.",
    parameters: object({
      productId: positive,
      productName: text,
      offerLabel: text,
      audience: text,
      tone: { type: "string", enum: ["irresistivel", "caseiro", "premium", "divertido"] },
    }),
  },
  {
    name: "set_availability",
    audiences: ["courier"],
    confirm: false,
    description: "Deixa o motoboy disponível ou indisponível para corridas.",
    parameters: object({ online: { type: "boolean" } }, ["online"]),
  },
  {
    name: "list_deliveries",
    audiences: ["courier"],
    confirm: false,
    description: "Lista as entregas disponíveis para este motoboy.",
    parameters: object({}),
  },
  {
    name: "accept_delivery",
    audiences: ["courier"],
    confirm: false,
    description: "Aceita uma entrega que já está na lista deste motoboy.",
    parameters: object({ offerId: positive }, ["offerId"]),
  },
  {
    name: "update_delivery",
    audiences: ["courier"],
    confirm: false,
    description: "Atualiza a entrega deste motoboy: picked_up quando retirou, delivered quando entregou. Para delivered, informe o código que o cliente mostrou.",
    parameters: object({
      orderId: positive,
      step: { type: "string", enum: ["picked_up", "delivered"] },
      code: text,
      cashReceived: { type: "boolean" },
    }, ["orderId", "step"]),
  },
  {
    name: "earnings_today",
    audiences: ["courier"],
    confirm: false,
    description: "Mostra quanto este motoboy ganhou hoje.",
    parameters: object({}),
  },
];

export function toolsForAudience(audience: AssistantAudience) {
  return ASSISTANT_TOOLS.filter((tool) => tool.audiences.includes(audience));
}

export function findAssistantTool(name: string) {
  return ASSISTANT_TOOLS.find((tool) => tool.name === name);
}
