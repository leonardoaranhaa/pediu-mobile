export type CommissionRuleInput = {
  type: "percentage" | "fixed" | "hybrid";
  percentage: string;
  fixedAmount: string;
};

export type PaymentReconciliationClassification =
  | "matched"
  | "missing_internal"
  | "missing_provider"
  | "amount_mismatch"
  | "currency_mismatch"
  | "status_mismatch"
  | "duplicate";

export type ReconciliationComparison = {
  classification: PaymentReconciliationClassification;
  details: string;
};

export function parseAmountToCents(value: string | number): number {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Valor monetário inválido");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(`${whole}${fraction.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error("Valor monetário inválido");
  }
  return cents;
}

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Centavos inválidos");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function normalizeCurrency(currency: string): "BRL" {
  if (currency.trim().toUpperCase() !== "BRL") {
    throw new Error("Somente BRL é suportado nesta fase financeira");
  }
  return "BRL";
}

export function normalizeProviderPaymentStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved" || normalized === "authorized") return "paid";
  if (normalized === "rejected") return "failed";
  if (["in_process", "in_mediation"].includes(normalized)) return "pending";
  return normalized;
}

export function calculateCommissionCents(
  grossCents: number,
  rule?: CommissionRuleInput,
): number {
  if (!rule) return 0;
  const percentageCents = Math.round(
    (grossCents * Number(rule.percentage)) / 100,
  );
  const fixedCents = Math.round(Number(rule.fixedAmount) * 100);
  const commission =
    rule.type === "percentage"
      ? percentageCents
      : rule.type === "fixed"
        ? fixedCents
        : percentageCents + fixedCents;
  return Math.min(Math.max(commission, 0), grossCents);
}

export function comparePaymentForReconciliation(input: {
  providerAmount: string | number;
  providerCurrency: string;
  providerStatus: string;
  internalAmount?: string | number;
  internalCurrency?: string;
  internalStatus?: string;
  paymentExists: boolean;
  duplicate: boolean;
}): ReconciliationComparison {
  if (input.duplicate) {
    return {
      classification: "duplicate",
      details: "Registro repetido no relatório do PSP",
    };
  }
  if (!input.paymentExists) {
    return {
      classification: "missing_internal",
      details: "Transação não encontrada no Pediu",
    };
  }
  if (
    input.providerCurrency.toUpperCase() !== (input.internalCurrency ?? "BRL")
  ) {
    return {
      classification: "currency_mismatch",
      details: "Moeda do PSP diverge da moeda interna",
    };
  }
  if (
    parseAmountToCents(input.providerAmount) !==
    parseAmountToCents(input.internalAmount ?? "0.00")
  ) {
    return {
      classification: "amount_mismatch",
      details: "Valor do PSP diverge do valor interno",
    };
  }
  if (
    normalizeProviderPaymentStatus(input.providerStatus) !==
    normalizeProviderPaymentStatus(input.internalStatus ?? "")
  ) {
    return {
      classification: "status_mismatch",
      details: "Status do PSP diverge do status interno",
    };
  }
  return { classification: "matched", details: "Transação conferida" };
}
