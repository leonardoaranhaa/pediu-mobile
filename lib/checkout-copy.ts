export type CheckoutDeliveryMode = "delivery" | "pickup";

export type CheckoutDeliverySummary = {
  title: string;
  label: string;
  detail: string;
  icon: "bolt" | "storefront" | "delivery-dining";
};

export function deliverySummaryCopy(input: {
  mode: CheckoutDeliveryMode;
  isFlash?: boolean;
  flashEtaMaxMinutes?: number | null;
}): CheckoutDeliverySummary {
  if (input.mode === "pickup") {
    return {
      title: "Retirada na loja",
      label: "Sem taxa de entrega",
      detail: "A loja avisa quando o pedido estiver pronto para você buscar.",
      icon: "storefront",
    };
  }

  if (input.isFlash && input.flashEtaMaxMinutes != null) {
    return {
      title: "Entrega Flash",
      label: `Previsão de até ${input.flashEtaMaxMinutes} min`,
      detail: "A previsão começa após a confirmação do pedido e depende do preparo da loja.",
      icon: "bolt",
    };
  }

  return {
    title: "Entrega padrão",
    label: "Prazo confirmado após o aceite",
    detail: "A previsão final depende do preparo da loja e da disponibilidade de um entregador.",
    icon: "delivery-dining",
  };
}

export const cancellationPolicyCopy = [
  {
    title: "Antes do preparo",
    detail: "Você pode cancelar enquanto o pedido estiver aguardando confirmação ou tiver sido aceito pela loja.",
  },
  {
    title: "Depois do início do preparo",
    detail: "Quando a loja começar a preparar, o cancelamento pelo cliente deixa de estar disponível.",
  },
  {
    title: "Pagamento pendente",
    detail: "Se o pagamento ainda não foi concluído, o cancelamento do pedido também cancela essa cobrança.",
  },
] as const;
