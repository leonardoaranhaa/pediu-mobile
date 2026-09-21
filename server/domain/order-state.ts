export type OrderStatus =
  | "Pendente"
  | "Aceito"
  | "Preparando"
  | "Pronto"
  | "A caminho"
  | "Entregue"
  | "Cancelado";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  Pendente: ["Aceito", "Cancelado"],
  Aceito: ["Preparando", "Cancelado"],
  Preparando: ["Pronto", "Cancelado"],
  Pronto: ["A caminho", "Cancelado"],
  "A caminho": ["Entregue"],
  Entregue: [],
  Cancelado: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
  }
}
