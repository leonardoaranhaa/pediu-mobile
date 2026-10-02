export const ORDER_STATUSES = [
  "Pendente",
  "Aceito",
  "Preparando",
  "Pronto",
  "A caminho",
  "Entregue",
  "Cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  Pendente: ["Aceito", "Cancelado"],
  Aceito: ["Preparando", "Cancelado"],
  Preparando: ["Pronto", "Cancelado"],
  Pronto: ["A caminho", "Cancelado"],
  "A caminho": ["Entregue"],
  Entregue: [],
  Cancelado: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  fulfillmentMode: "delivery" | "pickup" = "delivery",
): boolean {
  if (fulfillmentMode === "pickup" && to === "A caminho") return false;
  if (fulfillmentMode === "pickup" && from === "Pronto" && to === "Entregue")
    return true;
  return allowedTransitions[from].includes(to);
}

export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return status === "Pendente" || status === "Aceito";
}
