import { createServer } from "node:http";

const port = Number(process.env.MERCADO_PAGO_MOCK_PORT ?? 3100);
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "";

type FakePayment = {
  id: string;
  status: "pending";
  transaction_amount: number;
  currency_id: "BRL";
  external_reference: string;
};

const paymentsById = new Map<string, FakePayment>();
const paymentsByIdempotencyKey = new Map<string, string>();

function json(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function withPixData(payment: FakePayment) {
  return {
    ...payment,
    point_of_interaction: {
      transaction_data: {
        qr_code: `000201-MOCK-PIX-${payment.id}`,
        qr_code_base64: "ZmFrZS1waXgtcXI=",
        ticket_url: `https://pediu-test.invalid/pix/${payment.id}`,
      },
    },
  };
}

async function readJson(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    transaction_amount?: number;
    payment_method_id?: string;
    external_reference?: string;
  };
}

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (request.headers.authorization !== `Bearer ${accessToken}`) {
    json(response, 401, { error: "invalid test token" });
    return;
  }

  if (request.method === "POST" && request.url === "/v1/payments") {
    const idempotencyKey = request.headers["x-idempotency-key"];
    if (typeof idempotencyKey !== "string" || !idempotencyKey) {
      json(response, 400, { error: "missing idempotency key" });
      return;
    }

    try {
      const body = await readJson(request);
      const orderMatch = body.external_reference?.match(/^pediu-order-(\d+)$/);
      const amount = Number(body.transaction_amount);
      if (
        body.payment_method_id !== "pix" ||
        !orderMatch ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        json(response, 400, { error: "invalid test payment payload" });
        return;
      }

      const existingId = paymentsByIdempotencyKey.get(idempotencyKey);
      if (existingId) {
        const existing = paymentsById.get(existingId);
        if (existing) {
          json(response, 201, withPixData(existing));
          return;
        }
      }

      const id = orderMatch[1]!;
      const payment: FakePayment = {
        id,
        status: "pending",
        transaction_amount: amount,
        currency_id: "BRL",
        external_reference: body.external_reference!,
      };
      paymentsById.set(id, payment);
      paymentsByIdempotencyKey.set(idempotencyKey, id);
      json(response, 201, withPixData(payment));
    } catch {
      json(response, 400, { error: "invalid test payment JSON" });
    }
    return;
  }

  const match = request.url?.match(/^\/v1\/payments\/(\d+)$/);
  if (request.method !== "GET" || !match) {
    response.writeHead(404);
    response.end();
    return;
  }

  const id = match[1]!;
  const payment = paymentsById.get(id) ?? {
    id,
    status: "pending" as const,
    transaction_amount: 17,
    currency_id: "BRL" as const,
    external_reference: `pediu-order-${id}`,
  };
  json(response, 200, { ...payment, status: "approved" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mercado Pago test API listening on 127.0.0.1:${port}`);
});
