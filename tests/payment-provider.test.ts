import { afterEach, describe, expect, it, vi } from "vitest";
import { createPixCharge } from "../server/payments";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const baseInput = {
  orderId: 20,
  amount: "15.00",
  payerEmail: "cliente@example.test",
  idempotencyKey: "pix-order-20",
};

function configureMercadoPago() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PIX_PROVIDER", "mercado_pago");
  vi.stubEnv("MERCADO_PAGO_ACCESS_TOKEN", "test-access-token");
  vi.stubEnv(
    "MERCADO_PAGO_NOTIFICATION_URL",
    "https://pediu.example.test/api/webhooks/payments",
  );
}

describe("Mercado Pago PIX provider", () => {
  it("keeps manual pending charges available outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PIX_PROVIDER", "manual");

    await expect(createPixCharge(baseInput)).resolves.toMatchObject({
      provider: "manual",
      status: "pending",
    });
  });

  it("refuses to represent a manual local record as a production PIX charge", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PIX_PROVIDER", "manual");

    await expect(createPixCharge(baseInput)).rejects.toThrow(
      "não pode criar cobranças em produção",
    );
  });

  it("creates a real pending Pix payment with the required idempotency key and returns QR data", async () => {
    configureMercadoPago();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 987654321,
          status: "pending",
          point_of_interaction: {
            transaction_data: {
              qr_code: "000201-pix-copy-paste",
              qr_code_base64: "cXItY29kZS1iYXNlNjQ=",
              ticket_url: "https://www.mercadopago.com.br/pay/987654321",
            },
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createPixCharge(baseInput)).resolves.toMatchObject({
      provider: "mercado_pago",
      status: "pending",
      providerChargeId: "987654321",
      externalReference: "pediu-order-20",
      qrCode: "000201-pix-copy-paste",
      qrCodeBase64: "cXItY29kZS1iYXNlNjQ=",
      ticketUrl: "https://www.mercadopago.com.br/pay/987654321",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(headers.get("X-Idempotency-Key")).toBe("pix-order-20");
    expect(JSON.parse(String(init.body))).toEqual({
      transaction_amount: 15,
      payment_method_id: "pix",
      payer: { email: "cliente@example.test" },
      external_reference: "pediu-order-20",
      notification_url: "https://pediu.example.test/api/webhooks/payments",
    });
  });

  it("keeps an approved create response pending until the canonical webhook flow confirms it", async () => {
    configureMercadoPago();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "123", status: "approved" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(createPixCharge(baseInput)).resolves.toMatchObject({
      status: "pending",
      providerChargeId: "123",
    });
  });

  it("ignores the local API base override in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PIX_PROVIDER", "mercado_pago");
    vi.stubEnv("MERCADO_PAGO_ACCESS_TOKEN", "test-access-token");
    vi.stubEnv(
      "MERCADO_PAGO_NOTIFICATION_URL",
      "https://pediu.example.test/api/webhooks/payments",
    );
    vi.stubEnv("MERCADO_PAGO_API_BASE_URL", "http://127.0.0.1:3100");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "123", status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createPixCharge(baseInput);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.mercadopago.com/v1/payments",
    );
  });

  it("returns a failed charge when Mercado Pago rejects the payment", async () => {
    configureMercadoPago();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "987", status: "rejected" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(createPixCharge(baseInput)).resolves.toMatchObject({
      provider: "mercado_pago",
      status: "failed",
      providerChargeId: "987",
    });
  });

  it("requires a server-side Access Token and HTTPS notification URL", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PIX_PROVIDER", "mercado_pago");
    vi.stubEnv(
      "MERCADO_PAGO_NOTIFICATION_URL",
      "https://pediu.example.test/api/webhooks/payments",
    );
    vi.stubEnv("MERCADO_PAGO_ACCESS_TOKEN", "");
    await expect(createPixCharge(baseInput)).rejects.toThrow(
      "MERCADO_PAGO_ACCESS_TOKEN",
    );

    vi.stubEnv("MERCADO_PAGO_ACCESS_TOKEN", "test-token");
    vi.stubEnv("MERCADO_PAGO_NOTIFICATION_URL", "http://not-secure.test");
    await expect(createPixCharge(baseInput)).rejects.toThrow("HTTPS");
  });
});
