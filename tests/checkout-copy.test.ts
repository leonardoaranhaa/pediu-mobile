import { describe, expect, it } from "vitest";
import {
  cancellationPolicyCopy,
  deliverySummaryCopy,
} from "../lib/checkout-copy";

describe("Pediu checkout confirmation cards", () => {
  it("shows only server-provided numeric time for Flash", () => {
    expect(
      deliverySummaryCopy({
        mode: "delivery",
        isFlash: true,
        flashEtaMaxMinutes: 25,
      }),
    ).toMatchObject({
      title: "Entrega Flash",
      label: "Previsão de até 25 min",
      icon: "bolt",
    });
  });

  it("does not invent a standard delivery duration", () => {
    const summary = deliverySummaryCopy({ mode: "delivery", isFlash: false });
    expect(summary.title).toBe("Entrega padrão");
    expect(summary.label).toContain("após o aceite");
    expect(summary.label).not.toMatch(/\d+\s*min/);
  });

  it("explains pickup and the real cancellation boundary", () => {
    expect(deliverySummaryCopy({ mode: "pickup" })).toMatchObject({
      title: "Retirada na loja",
      label: "Sem taxa de entrega",
    });
    expect(cancellationPolicyCopy).toHaveLength(3);
    expect(cancellationPolicyCopy[1].detail).toContain("deixa de estar disponível");
    expect(cancellationPolicyCopy[2].detail).toContain("cancelamento do pedido");
    expect(cancellationPolicyCopy[2].detail).toContain("cobrança");
  });
});
