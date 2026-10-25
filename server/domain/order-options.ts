export type PricedOptionChoice = {
  id: number;
  name: string;
  priceDelta: string | number;
};

export type PricedOptionGroup = {
  id: number;
  name: string;
  required: number | boolean;
  choices: PricedOptionChoice[];
};

export type PricedOptions =
  | { ok: false; message: string }
  | { ok: true; unitPrice: string; label: string; optionIds: number[] };

function isRequired(value: number | boolean) {
  return value === true || value === 1;
}

export function priceSelectedOptions(
  basePrice: string | number,
  groups: PricedOptionGroup[],
  optionIds: number[] | undefined,
): PricedOptions {
  const ids = optionIds ?? [];
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: "Escolha cada opção uma vez só." };
  }

  const byId = new Map<number, { choice: PricedOptionChoice; group: PricedOptionGroup }>();
  for (const group of groups) {
    for (const choice of group.choices) {
      byId.set(choice.id, { choice, group });
    }
  }

  const chosenByGroup = new Map<number, { choice: PricedOptionChoice; group: PricedOptionGroup }>();
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) {
      return { ok: false, message: "Essa opção não faz parte deste produto." };
    }
    if (chosenByGroup.has(found.group.id)) {
      return { ok: false, message: `Escolha só uma opção em ${found.group.name}.` };
    }
    chosenByGroup.set(found.group.id, found);
  }

  for (const group of groups) {
    if (isRequired(group.required) && group.choices.length > 0 && !chosenByGroup.has(group.id)) {
      return { ok: false, message: `Escolha ${group.name} para continuar.` };
    }
  }

  let extra = 0;
  const labels: string[] = [];
  const selected: number[] = [];
  for (const group of groups) {
    const chosen = chosenByGroup.get(group.id);
    if (!chosen) continue;
    const delta = Number(chosen.choice.priceDelta);
    extra += Number.isFinite(delta) ? delta : 0;
    labels.push(`${group.name}: ${chosen.choice.name}`);
    selected.push(chosen.choice.id);
  }

  const base = Number(basePrice);
  const unit = (Number.isFinite(base) ? base : 0) + extra;
  return {
    ok: true,
    unitPrice: unit.toFixed(2),
    label: labels.join(" · "),
    optionIds: selected,
  };
}

export function composeItemNote(label: string, customerNote?: string | null) {
  const note = (customerNote ?? "").trim();
  const cleanLabel = label.trim();
  if (!cleanLabel) return note.slice(0, 500) || undefined;
  if (!note || note === cleanLabel || note.startsWith(cleanLabel)) {
    return (note || cleanLabel).slice(0, 500);
  }
  return `${cleanLabel}. ${note}`.slice(0, 500);
}

export type OrderPaymentMethod =
  | "pix"
  | "card"
  | "cash"
  | "fiado"
  | "card_credit"
  | "card_debit";

export function paymentMethodLabel(method: string | null | undefined) {
  if (method === "cash") return "Dinheiro";
  if (method === "pix") return "PIX";
  if (method === "card_credit") return "Crédito na entrega";
  if (method === "card_debit") return "Débito na entrega";
  if (method === "card") return "Cartão";
  if (method === "fiado") return "Fiado";
  return "Pagamento a confirmar";
}

export function collectsPaymentOnDelivery(method: string | null | undefined) {
  return method === "cash" || method === "card_credit" || method === "card_debit";
}
