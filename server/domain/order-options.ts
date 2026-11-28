import {
  missingOptionChoice,
  optionGroupLimits,
  type OptionSelection,
} from "../../shared/option-rules";
export type PricedOptionChoice = {
  id: number;
  name: string;
  priceDelta: string | number;
};

export type PricedOptionGroup = {
  id: number;
  name: string;
  required: number | boolean;
  minChoices?: number | null;
  maxChoices?: number | null;
  choices: PricedOptionChoice[];
};

export type PricedOptions =
  | { ok: false; message: string }
  | { ok: true; unitPrice: string; label: string; optionIds: number[] };

export function priceSelectedOptions(
  basePrice: string | number,
  groups: PricedOptionGroup[],
  optionIds: number[] | undefined,
): PricedOptions {
  const ids = optionIds ?? [];
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: "Escolha cada opção uma vez só." };
  }

  const groupByChoice = new Map<number, PricedOptionGroup>();
  for (const group of groups) {
    for (const choice of group.choices) groupByChoice.set(choice.id, group);
  }

  const selection: OptionSelection = {};
  for (const id of ids) {
    const group = groupByChoice.get(id);
    if (!group) {
      return { ok: false, message: "Essa opção não faz parte deste produto." };
    }
    selection[group.id] = [...(selection[group.id] ?? []), id];
  }

  for (const group of groups) {
    const { max } = optionGroupLimits(group);
    const count = (selection[group.id] ?? []).length;
    if (count > max) {
      return {
        ok: false,
        message:
          max === 1
            ? `Escolha só uma opção em ${group.name}.`
            : `Escolha até ${max} opções em ${group.name}.`,
      };
    }
  }
  const missing = missingOptionChoice(groups, selection);
  if (missing) return { ok: false, message: missing.message };

  let extra = 0;
  const labels: string[] = [];
  const selected: number[] = [];
  for (const group of groups) {
    const chosen = group.choices.filter((choice) => (selection[group.id] ?? []).includes(choice.id));
    if (!chosen.length) continue;
    for (const choice of chosen) {
      const delta = Number(choice.priceDelta);
      extra += Number.isFinite(delta) ? delta : 0;
      selected.push(choice.id);
    }
    labels.push(`${group.name}: ${chosen.map((choice) => choice.name).join(", ")}`);
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

export function paymentLabelWithChange(
  method: string | null | undefined,
  changeFor: string | number | null | undefined,
) {
  const label = paymentMethodLabel(method);
  const amount = Number(changeFor);
  if (method === "cash" && Number.isFinite(amount) && amount > 0) {
    return `${label} · troco para R$ ${amount.toFixed(2).replace(".", ",")}`;
  }
  return label;
}

export function collectsPaymentOnDelivery(method: string | null | undefined) {
  return method === "cash" || method === "card_credit" || method === "card_debit";
}
