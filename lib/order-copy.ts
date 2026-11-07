export type CustomerOrderStatus =
  | "Pendente"
  | "Aceito"
  | "Preparando"
  | "Pronto"
  | "A caminho"
  | "Entregue"
  | "Cancelado";

export const ORDER_STATUS_COPY: Record<
  CustomerOrderStatus,
  { label: string; detail: string }
> = {
  Pendente: {
    label: "Pedido recebido",
    detail: "A loja recebeu seu pedido e vai confirmar os próximos passos.",
  },
  Aceito: {
    label: "Pedido aceito",
    detail: "A loja confirmou o pedido e está se organizando para preparar.",
  },
  Preparando: {
    label: "Em preparo",
    detail: "A loja está preparando tudo com cuidado.",
  },
  Pronto: {
    label: "Pronto para sair",
    detail: "Seu pedido está pronto e aguardando retirada ou saída para entrega.",
  },
  "A caminho": {
    label: "A caminho",
    detail: "Seu pedido saiu para entrega. Acompanhe a última atualização abaixo.",
  },
  Entregue: {
    label: "Pedido entregue",
    detail: "Tudo certo: o pedido foi marcado como entregue.",
  },
  Cancelado: {
    label: "Pedido cancelado",
    detail: "Este pedido não seguirá para preparo ou entrega.",
  },
};

export function orderStatusCopy(status: string) {
  return ORDER_STATUS_COPY[status as CustomerOrderStatus] ?? {
    label: status,
    detail: "O pedido recebeu uma atualização da loja.",
  };
}

export function paymentStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "confirmado";
    case "failed":
      return "não aprovado";
    case "cancelled":
      return "cancelado";
    default:
      return "aguardando confirmação";
  }
}

export function trackingEventLabel(eventType: string) {
  return orderStatusCopy(eventType).label;
}

export function trackingFreshnessLabel(freshness: string) {
  switch (freshness) {
    case "fresh":
      return "Posição atualizada recentemente";
    case "stale":
      return "Última posição há algum tempo";
    default:
      return "Ainda sem posição recente";
  }
}
