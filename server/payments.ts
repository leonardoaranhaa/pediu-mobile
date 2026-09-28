export type PixChargeStatus = "pending" | "failed";

export type PixChargeResult = {
  provider: string;
  status: PixChargeStatus;
  providerChargeId?: string;
  externalReference?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  message: string;
};

export type MercadoPagoPayment = {
  id: string | number;
  status: string;
  status_detail?: string;
  transaction_amount: string | number;
  currency_id: string;
  external_reference?: string | null;
};

const MERCADO_PAGO_API = "https://api.mercadopago.com";

function mercadoPagoApiBase() {
  const testOverride = process.env.MERCADO_PAGO_API_BASE_URL?.trim();
  if (process.env.NODE_ENV !== "production" && testOverride) {
    return testOverride.replace(/\/$/, "");
  }
  return MERCADO_PAGO_API;
}

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN precisa estar configurado no servidor.",
    );
  }
  return token;
}

function amountAsNumber(amount: string | undefined) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Valor PIX inválido.");
  }
  return Number(parsed.toFixed(2));
}

/**
 * Gateway boundary for PIX. The application never trusts a browser-supplied
 * status and never marks a charge paid from the create-payment response.
 */
export async function createPixCharge(input: {
  orderId: number;
  amount: string;
  payerEmail: string;
  idempotencyKey: string;
}): Promise<PixChargeResult> {
  const provider = process.env.PIX_PROVIDER ?? "manual";
  if (provider === "manual") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PIX_PROVIDER=manual não pode criar cobranças em produção; configure Mercado Pago.",
      );
    }
    return {
      provider,
      status: "pending",
      message:
        "Cobrança criada localmente; configure um gateway para confirmação automática.",
    };
  }
  if (provider !== "mercado_pago") {
    throw new Error(`PIX_PROVIDER=${provider} não é suportado.`);
  }

  const payerEmail = input.payerEmail.trim();
  if (!payerEmail) throw new Error("E-mail do pagador é obrigatório para PIX.");

  const externalReference = `pediu-order-${input.orderId}`;
  const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim();
  if (!notificationUrl) {
    throw new Error(
      "MERCADO_PAGO_NOTIFICATION_URL precisa estar configurada no servidor.",
    );
  }
  let parsedNotificationUrl: URL;
  try {
    parsedNotificationUrl = new URL(notificationUrl);
  } catch {
    throw new Error("MERCADO_PAGO_NOTIFICATION_URL inválida.");
  }
  if (parsedNotificationUrl.protocol !== "https:") {
    throw new Error("MERCADO_PAGO_NOTIFICATION_URL precisa usar HTTPS.");
  }

  const response = await fetch(`${mercadoPagoApiBase()}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      transaction_amount: amountAsNumber(input.amount),
      payment_method_id: "pix",
      payer: { email: payerEmail },
      external_reference: externalReference,
      notification_url: notificationUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Mercado Pago recusou a criação PIX (HTTP ${response.status}).`,
    );
  }

  const payload = (await response.json()) as {
    id?: string | number;
    status?: string;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    };
  };
  if (payload.id === undefined || payload.id === null) {
    throw new Error("Mercado Pago não retornou o identificador do pagamento.");
  }

  const transactionData = payload.point_of_interaction?.transaction_data;
  const status: PixChargeStatus =
    payload.status === "rejected" || payload.status === "cancelled"
      ? "failed"
      : "pending";
  return {
    provider: "mercado_pago",
    status,
    providerChargeId: String(payload.id),
    externalReference,
    qrCode: transactionData?.qr_code,
    qrCodeBase64: transactionData?.qr_code_base64,
    ticketUrl: transactionData?.ticket_url,
    message:
      status === "failed"
        ? "O Mercado Pago recusou a cobrança PIX."
        : "Cobrança PIX criada no Mercado Pago; aguardando confirmação canônica.",
  };
}

/** Fetch the canonical payment resource; webhook body fields are never trusted. */
export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPayment> {
  const response = await fetch(
    `${mercadoPagoApiBase()}/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Consulta canônica Mercado Pago falhou (HTTP ${response.status}).`,
    );
  }
  return (await response.json()) as MercadoPagoPayment;
}
