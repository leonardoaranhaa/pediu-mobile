import { afterEach, describe, expect, it, vi } from "vitest";
import * as db from "../server/db";
import * as payments from "../server/payments";
import { refundNotice, refundPixPayment } from "../server/pix-release";

const input = { paymentId: 10, orderId: 10, transactionId: "mp-10", amount: "24.50", idempotencyKey: "pix-refund-cancelled-10", reason: "Pedido cancelado" };
const row = (status: string) => ({ id: 1, paymentId: 10, orderId: 10, status, amount: "24.50" }) as any;

describe("PIX refund is recorded", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stores the refund and the provider outcome", async () => {
    const create = vi.spyOn(db, "createPaymentRefund").mockResolvedValue(row("pending"));
    vi.spyOn(payments, "requestPixRefund").mockResolvedValue({ provider: "mercado_pago", status: "refunded", providerRefundId: "rf-1", message: "" } as any);
    const update = vi.spyOn(db, "updatePaymentRefund").mockResolvedValue(row("refunded"));
    const result = await refundPixPayment(input);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ paymentId: 10, idempotencyKey: "pix-refund-cancelled-10", amount: "24.50" }));
    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ status: "refunded", providerRefundId: "rf-1" }));
    expect(result).toMatchObject({ created: true, refund: { status: "refunded" } });
  });

  it("does not ask the provider again when the same refund already exists", async () => {
    vi.spyOn(db, "createPaymentRefund").mockResolvedValue(row("processing"));
    const provider = vi.spyOn(payments, "requestPixRefund");
    const result = await refundPixPayment(input);
    expect(provider).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
  });

  it("marks the refund as failed when the provider refuses it", async () => {
    vi.spyOn(db, "createPaymentRefund").mockResolvedValue(row("pending"));
    vi.spyOn(payments, "requestPixRefund").mockRejectedValue(new Error("Mercado Pago recusou o refund (HTTP 400)."));
    const update = vi.spyOn(db, "updatePaymentRefund").mockResolvedValue(row("failed"));
    await expect(refundPixPayment(input)).rejects.toThrow("recusou");
    expect(update).toHaveBeenCalledWith(1, { status: "failed" });
  });

  it("only says the money is back once the provider confirms", () => {
    expect(refundNotice("refunded", "24.50", false)).toEqual({
      title: "PIX estornado",
      body: "O pedido foi cancelado. Os R$ 24,50 já foram devolvidos para a sua conta.",
    });
    expect(refundNotice("processing", "24.50", true).title).toBe("Estorno do PIX pedido");
    expect(refundNotice("processing", "24.50", true).body).toContain("O PIX chegou depois que o pedido foi cancelado.");
  });
});
