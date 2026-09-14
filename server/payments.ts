import { ENV } from "./_core/env";

export type PixChargeResult = {
  provider: string;
  status: "pending";
  providerChargeId?: string;
  checkoutUrl?: string;
  message: string;
};

/**
 * Gateway boundary for PIX. The app never fabricates a paid state: until a
 * provider webhook confirms it, every charge remains pending.
 */
export async function createPixCharge(input: { orderId: number; amount?: string; pixKey: string }): Promise<PixChargeResult> {
  const provider = process.env.PIX_PROVIDER ?? "manual";
  if (provider === "manual") {
    return { provider, status: "pending", message: "Cobrança criada localmente; configure um gateway para confirmação automática." };
  }

  if (!ENV.pixApiUrl || !ENV.pixApiKey) {
    throw new Error(`PIX_PROVIDER=${provider} exige PIX_API_URL e PIX_API_KEY configurados como segredos.`);
  }

  const response = await fetch(`${ENV.pixApiUrl.replace(/\/$/, "")}/charges`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.pixApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ externalReference: `pediu-order-${input.orderId}`, amount: input.amount ?? "0.00", pixKey: input.pixKey }),
  });
  if (!response.ok) throw new Error(`PIX gateway returned ${response.status}`);
  const payload = (await response.json()) as { id?: string; checkoutUrl?: string };
  return { provider, status: "pending", providerChargeId: payload.id, checkoutUrl: payload.checkoutUrl, message: "Cobrança enviada ao gateway; aguardando webhook de confirmação." };
}
