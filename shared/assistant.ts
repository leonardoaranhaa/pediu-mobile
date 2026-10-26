export type AssistantAudience = "guest" | "customer" | "merchant" | "courier";

export type AssistantCartLine = {
  productId: number;
  quantity: number;
  optionIds?: number[];
  note?: string;
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
