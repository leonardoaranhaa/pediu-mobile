import { describe, expect, it } from "vitest";
import { canCustomerCancelOrder, canTransitionOrder } from "../server/order-state";

describe("Pediu order state machine", () => {
  it("allows the operational delivery path", () => {
    expect(canTransitionOrder("Pendente", "Aceito")).toBe(true);
    expect(canTransitionOrder("Aceito", "Preparando")).toBe(true);
    expect(canTransitionOrder("Preparando", "Pronto")).toBe(true);
    expect(canTransitionOrder("Pronto", "A caminho")).toBe(true);
    expect(canTransitionOrder("A caminho", "Entregue")).toBe(true);
  });

  it("blocks invalid state jumps and reopening", () => {
    expect(canTransitionOrder("Pendente", "Pronto")).toBe(false);
    expect(canTransitionOrder("Entregue", "Preparando")).toBe(false);
    expect(canTransitionOrder("Cancelado", "Aceito")).toBe(false);
  });

  it("allows customer cancellation only before preparation", () => {
    expect(canCustomerCancelOrder("Pendente")).toBe(true);
    expect(canCustomerCancelOrder("Aceito")).toBe(true);
    expect(canCustomerCancelOrder("Preparando")).toBe(false);
    expect(canCustomerCancelOrder("Entregue")).toBe(false);
  });
});
