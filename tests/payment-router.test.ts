import { describe, expect, it, vi, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Teste",
  email: "cliente@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu payment operational contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists a pending payment as paid through the real router contract", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 601,
      orderId: 501,
      method: "pix",
      status: "pending",
      pixKey: "pix@test.local",
      transactionId: null,
      createdAt: new Date(),
    } as any);
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({ id: 501, customerId: 20 } as any);
    const update = vi.spyOn(db, "updatePaymentStatus").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.payments.confirm({
      paymentId: 601,
      gatewayStatus: "paid",
    });

    expect(result).toMatchObject({ paymentId: 601, status: "paid" });
    expect(update).toHaveBeenCalledWith(601, "paid");
  });

  it("rejects confirmation for a payment the user cannot access", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(
      caller.pediu.payments.confirm({
        paymentId: 999,
        gatewayStatus: "paid",
      }),
    ).rejects.toThrow("Pagamento não encontrado ou não autorizado");
  });

  it("does not allow a paid payment to become failed", async () => {
    vi.spyOn(db, "getPaymentForUser").mockResolvedValue({
      id: 601,
      orderId: 501,
      method: "pix",
      status: "paid",
      pixKey: "pix@test.local",
      transactionId: "tx-601",
      createdAt: new Date(),
    } as any);
    vi.spyOn(db, "getOrderForCustomer").mockResolvedValue({ id: 501, customerId: 20 } as any);
    const update = vi.spyOn(db, "updatePaymentStatus").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);

    await expect(
      caller.pediu.payments.confirm({
        paymentId: 601,
        gatewayStatus: "failed",
      }),
    ).rejects.toThrow("Transição de pagamento inválida");

    expect(update).not.toHaveBeenCalled();
  });
});
