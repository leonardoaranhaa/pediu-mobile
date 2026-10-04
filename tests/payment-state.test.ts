import { describe, expect, it } from "vitest";

import { canTransitionPayment } from "../server/db";

describe("Pediu payment state machine", () => {
  it("allows a pending payment to resolve once", () => {
    expect(canTransitionPayment("pending", "paid")).toBe(true);
    expect(canTransitionPayment("pending", "failed")).toBe(true);
    expect(canTransitionPayment("pending", "cancelled")).toBe(true);
  });

  it("does not reopen a cancelled or paid payment", () => {
    expect(canTransitionPayment("cancelled", "paid")).toBe(false);
    expect(canTransitionPayment("paid", "pending")).toBe(false);
    expect(canTransitionPayment("paid", "cancelled")).toBe(false);
  });
});
