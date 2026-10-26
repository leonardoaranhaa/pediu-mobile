export type StoreApprovalStatus = "pending" | "approved" | "rejected";
export type DeliveryFeeMode = "fixed" | "distance";

export type StoreOps = {
  approvalStatus: StoreApprovalStatus;
  cardCreditEnabled: boolean;
  cardDebitEnabled: boolean;
  pausedUntil: Date | null;
  pauseManual: boolean;
  feeMode: DeliveryFeeMode;
  feePerKm: string;
};

export const DEFAULT_STORE_OPS: StoreOps = {
  approvalStatus: "approved",
  cardCreditEnabled: false,
  cardDebitEnabled: false,
  pausedUntil: null,
  pauseManual: false,
  feeMode: "fixed",
  feePerKm: "0.00",
};

const SAO_PAULO = "America/Sao_Paulo";

export function storePauseView(
  ops: {
    pausedUntil?: Date | string | null;
    pauseManual?: boolean | number | null;
  },
  now = new Date(),
): { paused: boolean; message: string | null; expired: boolean } {
  if (ops.pauseManual === true || ops.pauseManual === 1) {
    return { paused: true, message: "Fechada no momento", expired: false };
  }
  if (!ops.pausedUntil) return { paused: false, message: null, expired: false };
  const reopenAt =
    ops.pausedUntil instanceof Date
      ? ops.pausedUntil
      : new Date(ops.pausedUntil);
  if (Number.isNaN(reopenAt.getTime()) || reopenAt.getTime() <= now.getTime()) {
    return { paused: false, message: null, expired: true };
  }
  const time = reopenAt.toLocaleTimeString("pt-BR", {
    timeZone: SAO_PAULO,
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    paused: true,
    message: `Fechada no momento, volta às ${time}`,
    expired: false,
  };
}

export function sellingBlockReason(input: {
  approvalStatus: StoreApprovalStatus;
  paused: boolean;
  pauseMessage: string | null;
}): string | null {
  if (input.approvalStatus === "pending")
    return "Esta loja ainda está em análise.";
  if (input.approvalStatus === "rejected")
    return "Esta loja não está disponível para pedidos.";
  if (input.paused) return input.pauseMessage ?? "Fechada no momento";
  return null;
}

export function cardOnDeliveryRejection(
  method: string,
  ops: { cardCreditEnabled: boolean; cardDebitEnabled: boolean },
): string | null {
  if (method === "card_credit" && !ops.cardCreditEnabled)
    return "Esta loja não aceita crédito na entrega.";
  if (method === "card_debit" && !ops.cardDebitEnabled)
    return "Esta loja não aceita débito na entrega.";
  return null;
}

export function roundMoney(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}
