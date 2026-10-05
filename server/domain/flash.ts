export type FlashStoreFields = {
  isOpen: number | boolean;
  flashEnabled?: number | boolean | null;
  flashEtaMaxMinutes?: number | null;
  flashFeeOverride?: string | number | null;
  deliveryFee?: string | number | null;
};

export type FlashQuoteResult = {
  eligible: boolean;
  isFlash: boolean;
  etaMaxMinutes: number | null;
  deliveryFee: string;
  reason?: string;
};

function asBool(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1;
}

export function resolveFlashFulfillment(
  store: FlashStoreFields,
  fulfillment: "standard" | "flash" = "standard",
): FlashQuoteResult {
  const standardFee = Number(store.deliveryFee ?? 0);
  const base: FlashQuoteResult = {
    eligible: asBool(store.isOpen) && asBool(store.flashEnabled),
    isFlash: false,
    etaMaxMinutes: store.flashEtaMaxMinutes ?? null,
    deliveryFee: standardFee.toFixed(2),
  };

  if (fulfillment !== "flash") return base;

  if (!asBool(store.isOpen)) {
    return { ...base, reason: "Estabelecimento fechado no momento" };
  }
  if (!asBool(store.flashEnabled)) {
    return { ...base, reason: "Esta loja não oferece Pediu Flash" };
  }

  const override = store.flashFeeOverride;
  const fee = override == null || override === "" ? standardFee : Number(override);
  if (!Number.isFinite(fee) || fee < 0) {
    return { ...base, reason: "Taxa Flash inválida na loja" };
  }

  return {
    eligible: true,
    isFlash: true,
    etaMaxMinutes: store.flashEtaMaxMinutes ?? 30,
    deliveryFee: fee.toFixed(2),
  };
}

export function clampTipAmount(tipAmount: number | undefined, subtotal: number): string {
  const tip = tipAmount ?? 0;
  if (!Number.isFinite(tip) || tip < 0) throw new Error("Gorjeta inválida");
  if (tip > Math.max(subtotal * 0.3, 50)) throw new Error("Gorjeta acima do limite permitido");
  return tip.toFixed(2);
}
