export type AssistantAudience = "guest" | "customer" | "merchant" | "courier";

export type AssistantCartLine = {
  productId: number;
  quantity: number;
  optionIds?: number[];
  note?: string;
  name?: string;
  storeName?: string;
};

export type AssistantCartOption = {
  id: number;
  groupId: number;
  groupName: string;
  name: string;
  priceDelta: string;
};

export type AssistantCartProduct = {
  id: number;
  storeId: number;
  name: string;
  storeName: string;
  category: string;
  description?: string | null;
  price: string;
  deliveryFee: string;
  storeKind?: "restaurant" | "market" | "service";
  flashEnabled?: boolean;
  saleUnit?: string | null;
  packSize?: string | number | null;
  options?: AssistantCartOption[];
};

export type AssistantClientAction =
  | { type: "add"; product: AssistantCartProduct; quantity: number }
  | { type: "remove"; productId: number; optionIds?: number[] }
  | { type: "quantity"; productId: number; optionIds?: number[]; quantity: number };

export type AssistantCard = {
  title: string;
  subtitle?: string;
  amount?: string;
  badge?: string;
  storeId?: number;
  productId?: number;
};

export type AssistantNavigation = {
  screen: "orders" | "cart" | "track" | "catalog" | "store_orders" | "courier";
  orderId?: number;
  label: string;
};

export type AssistantPending = {
  token: string;
  summary: string;
};

export type AssistantTurn = {
  reply: string;
  cards: AssistantCard[];
  clientActions: AssistantClientAction[];
  navigation?: AssistantNavigation;
  pendingConfirmation?: AssistantPending | null;
};

export const ASSISTANT_UNAVAILABLE =
  "O assistente não está disponível agora. Você pode continuar pelo aplicativo.";

const TECHNICAL_TOKEN = /\b(?:storeId|productId|offerId|orderId|refs)\b/i;

export function stripAssistantTokens(text: string): string {
  return text
    .replace(/\s*\([^)]*\b(?:storeId|productId|offerId|orderId|refs)\b[^)]*\)/gi, "")
    .replace(/\brefs(?:\.[A-Za-z0-9_]+)+\s*[:=]\s*["']?\d+["']?/gi, "")
    .replace(/\b(?:storeId|productId|offerId|orderId)\s*[:=]\s*["']?\d+["']?/gi, "")
    .replace(/\b(?:storeId|productId|offerId|orderId|refs)\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export function assistantTextForUser(text: string): string {
  const clean = stripAssistantTokens(text);
  if (!clean || TECHNICAL_TOKEN.test(clean)) return "Pode dizer o nome da loja ou do produto?";
  if (TECHNICAL_TOKEN.test(text) && /\b(?:diga|qual|informe|número|numero)\b/i.test(text)) {
    return "Qual o nome do item?";
  }
  return clean;
}
