export const NO_FIADO_LIMIT_MESSAGE =
  "Esse cliente ainda não tem limite de fiado. Defina um limite para continuar.";

export function formatFiadoMoney(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function fiadoChargeDecision(input: {
  amount: number;
  balance: number;
  creditLimit: number;
  proposedLimit?: number | null;
  status: string;
}):
  | { ok: true; creditLimit: number; newBalance: number }
  | { ok: false; message: string } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, message: "Informe um valor válido" };
  }
  if (input.status !== "active") {
    return { ok: false, message: "Cliente bloqueado" };
  }
  let limit = Number(input.creditLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    const proposed = input.proposedLimit;
    if (proposed == null || !Number.isFinite(proposed) || proposed <= 0) {
      return { ok: false, message: NO_FIADO_LIMIT_MESSAGE };
    }
    limit = proposed;
  }
  const balance = Number.isFinite(input.balance) ? input.balance : 0;
  const newBalance = balance + input.amount;
  if (newBalance > limit + 0.001) {
    return {
      ok: false,
      message: `Essa venda passa do limite de fiado de ${formatFiadoMoney(limit)}.`,
    };
  }
  return { ok: true, creditLimit: limit, newBalance };
}

export function fiadoPaymentDecision(balance: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, message: "Valor de lançamento inválido" };
  }
  const current = Number.isFinite(balance) ? balance : 0;
  if (amount > current + 0.001) {
    return {
      ok: false as const,
      message: "O pagamento é maior que o saldo do fiado.",
    };
  }
  return { ok: true as const, newBalance: current - amount };
}
