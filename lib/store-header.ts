export function formatStoreMoney(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "R$ 0,00";
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

export function storeHeaderCopy(input: {
  open: boolean;
  nextOpenLabel?: string | null;
  deliveryFee: string | number;
  prepMinutes?: number | null;
  minOrder?: string | number | null;
}) {
  const fee = Number(input.deliveryFee);
  const minimum = Number(input.minOrder ?? 0);
  const minutes = Number(input.prepMinutes ?? 0);
  const next = input.nextOpenLabel?.trim() || null;
  return {
    badge: input.open ? "Aberta" : "Fechada agora",
    closed: !input.open,
    timeLabel: minutes > 0 ? `Cerca de ${minutes} min` : null,
    feeLabel: fee > 0 ? `Entrega ${formatStoreMoney(fee)}` : "Entrega grátis",
    minOrderLabel: minimum > 0 ? `Pedido mínimo ${formatStoreMoney(minimum)}` : null,
    closedNote: input.open ? null : next && next !== "Fechada agora" ? next : null,
  };
}
