export const TIP_DESTINATIONS = ["courier", "store", "platform_pool"] as const;
export type TipDestination = (typeof TIP_DESTINATIONS)[number];

/** Product default until ops/policy overrides per store. Matches experience.flags.tipDestination. */
export const DEFAULT_TIP_DESTINATION: TipDestination = "courier";

export function normalizeTipDestination(value?: string | null): TipDestination {
  if (value && (TIP_DESTINATIONS as readonly string[]).includes(value)) return value as TipDestination;
  return DEFAULT_TIP_DESTINATION;
}

export type TipSettlementPlan =
  | { ok: true; amount: string; destination: TipDestination; note: string }
  | { ok: false; reason: string };

export function planTipSettlement(tipAmount: string | number | null | undefined, destination?: string | null): TipSettlementPlan {
  const amount = Number(tipAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Sem gorjeta para liquidar" };
  }
  const dest = normalizeTipDestination(destination);
  const note =
    dest === "courier"
      ? "Gorjeta ao entregador"
      : dest === "store"
        ? "Gorjeta creditada à loja"
        : "Gorjeta no pool da plataforma";
  return { ok: true, amount: amount.toFixed(2), destination: dest, note };
}

export function resolveTipRecipientUserId(input: {
  destination: TipDestination;
  courierUserId?: number | null;
  storeOwnerId?: number | null;
}): number | null {
  if (input.destination === "courier") {
    return Number.isInteger(input.courierUserId) && (input.courierUserId as number) > 0
      ? (input.courierUserId as number)
      : null;
  }
  if (input.destination === "store") {
    return Number.isInteger(input.storeOwnerId) && (input.storeOwnerId as number) > 0
      ? (input.storeOwnerId as number)
      : null;
  }
  return null;
}
