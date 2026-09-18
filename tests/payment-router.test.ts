import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as payments from "../server/payments";

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

  it("persists a pending payment as paid through the real router contract", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 601, orderId: 501, method: "pix", status: "pending",
      pixKey: "pix@test.local", transactionId: null, createdAt: new Date(),
    } as any);
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({ id: 501, customerId: 20 } as any);
    const update = vi.spyOn(db, "updatePaymentStatus").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.confirm({ paymentId: 601, gatewayStatus: "paid" });

    expect(result).toMatchObject({ paymentId: 601, status: "paid" });
    expect(update).toHaveBeenCalledWith(601, "paid");
  });

  it("rejects confirmation for a payment the user cannot access", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(caller.pediu.payments.confirm({ paymentId: 999, gatewayStatus: "paid" }))
      .rejects.toThrow("Pagamento não encontrado ou não autorizado");
  });

  it("does not allow a paid payment to become failed", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 601, orderId: 501, method: "pix", status: "paid",
      pixKey: "pix@test.local", transactionId: "tx-601", createdAt: new Date(),
    } as any);
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({ id: 501, customerId: 20 } as any);
    const update = vi.spyOn(db, "updatePaymentStatus").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(caller.pediu.payments.confirm({ paymentId: 601, gatewayStatus: "failed" }))
      .rejects.toThrow("Transição de pagamento inválida");

    expect(update).not.toHaveBeenCalled();
  });

  it("does not allow a merchant to confirm a customer payment", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 601, orderId: 501, method: "pix", status: "pending",
      pixKey: "pix@test.local", transactionId: "tx-601", createdAt: new Date(),
    } as any);
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: merchant } as any);

    await expect(caller.pediu.payments.confirm({ paymentId: 601, gatewayStatus: "paid" }))
      .rejects.toThrow("Somente o cliente do pedido pode solicitar confirmação de pagamento");
  });

  it("creates PIX using the persisted order total and store PIX key", async () => {
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({
      id: 501, customerId: 20, storeId: 7, total: "42.50", status: "Pendente",
    } as any);
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 7, pixKey: "store-pix@test.local",
    } as any);
    const charge = vi.spyOn(payments, "createPixCharge").mockResolvedValue({
      providerChargeId: "charge-501",
      checkoutUrl: "https://pix.test/charge-501",
      status: "pending",
    });
    const createPayment = vi.spyOn(db, "createPendingPixPayment").mockResolvedValue(701);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.createPix({ orderId: 501 });

    expect(charge).toHaveBeenCalledWith({
      orderId: 501,
      amount: "42.50",
      pixKey: "store-pix@test.local",
    });
    expect(createPayment).toHaveBeenCalledWith(501, "store-pix@test.local", "charge-501");
    expect(result).toMatchObject({ paymentId: 701, amount: "42.50", providerChargeId: "charge-501" });
  });

  it("rejects PIX creation for an order that is not owned by the customer", async () => {
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(caller.pediu.payments.createPix({ orderId: 999 }))
      .rejects.toThrow("Pedido não encontrado ou não autorizado");
  });
});
