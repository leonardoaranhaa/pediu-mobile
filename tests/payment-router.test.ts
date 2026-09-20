import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as payments from "../server/payments";
import * as push from "../server/push";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

const merchant = {
  id: 30,
  openId: "merchant-30",
  name: "Loja Teste",
  email: "loja@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

describe("Pediu payment operational contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not expose a client-controlled payment confirmation mutation", () => {
    const procedureNames = Object.keys((appRouter as any)._def.procedures ?? {});
    expect(procedureNames).not.toContain("pediu.payments.confirm");
  });

  it("returns payment status only to an authorized customer", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 701, orderId: 501, method: "pix", status: "pending",
      pixKey: "store-pix@test.local", transactionId: "charge-501", createdAt: new Date(),
    } as any);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.get({ paymentId: 701 });

    expect(result).toMatchObject({ id: 701, orderId: 501, status: "pending" });
  });

  it("rejects payment status lookup when the user is not authorized", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: merchant } as any);

    await expect(caller.pediu.payments.get({ paymentId: 701 }))
      .rejects.toThrow("Pagamento não encontrado ou não autorizado");
  });

  it("reuses an existing pending PIX payment instead of creating a duplicate charge", async () => {
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({
      id: 501, customerId: 20, storeId: 7, total: "42.50", status: "Pendente",
    } as any);
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7, pixKey: "store-pix@test.local",
    } as any);
    vi.spyOn(db, "getPendingPixPaymentForOrder").mockResolvedValue({
      id: 701, orderId: 501, method: "pix", status: "pending",
      pixKey: "store-pix@test.local", transactionId: "charge-existing", createdAt: new Date(),
    } as any);
    const charge = vi.spyOn(payments, "createPixCharge");

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.createPix({ orderId: 501 });

    expect(charge).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      paymentId: 701,
      amount: "42.50",
      providerChargeId: "charge-existing",
      status: "pending",
    });
  });

  it("creates PIX using the persisted order total and store PIX key", async () => {
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({
      id: 501, customerId: 20, storeId: 7, total: "42.50", status: "Pendente",
    } as any);
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7, pixKey: "store-pix@test.local",
    } as any);
    const charge = vi.spyOn(payments, "createPixCharge").mockResolvedValue({
      provider: "test",
      providerChargeId: "charge-501",
      checkoutUrl: "https://pix.test/charge-501",
      status: "pending",
      message: "pending",
    });
    const createPayment = vi.spyOn(db, "createPendingPixPayment").mockResolvedValue(701);
    const notify = vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 0 });

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.createPix({ orderId: 501 });

    expect(charge).toHaveBeenCalledWith({
      orderId: 501,
      amount: "42.50",
      pixKey: "store-pix@test.local",
      idempotencyKey: "pix-order-501",
    });
    expect(createPayment).toHaveBeenCalledWith(501, "store-pix@test.local", "charge-501");
    expect(notify).toHaveBeenCalledWith(20, "PIX gerado", "A cobrança PIX do pedido #501 está pronta para pagamento.", { type: "payment", orderId: 501, paymentId: 701, status: "pending" });
    expect(result).toMatchObject({ paymentId: 701, amount: "42.50", providerChargeId: "charge-501" });
  });

  it("rejects PIX creation for an order that is not owned by the customer", async () => {
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(caller.pediu.payments.createPix({ orderId: 999 }))
      .rejects.toThrow("Pedido não encontrado ou não autorizado");
  });
});
