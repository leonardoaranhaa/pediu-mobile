import { describe, expect, it } from "vitest";
import { paymentLabelWithChange } from "../server/domain/order-options";
import { parseOpeningHours } from "../shared/pilot-ops";
import { TRPCError } from "@trpc/server";
import { sellingBlockReason } from "../server/domain/store-ops";

describe("lojista order copy", () => {
  it("shows the cash change on the payment line", () => {
    expect(paymentLabelWithChange("cash", "50.00")).toBe(
      "Dinheiro · troco para R$ 50,00",
    );
    expect(paymentLabelWithChange("pix", "50.00")).toBe("PIX");
    expect(paymentLabelWithChange("cash", null)).toBe("Dinheiro");
  });

  it("does not invent opening hours when none are saved", () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours("")).toBeNull();
  });

  it("keeps a paused store message friendly", () => {
    const message = sellingBlockReason({
      approvalStatus: "approved",
      paused: true,
      pauseMessage: "Fechada no momento, volta às 00:21",
    });
    expect(message).toMatch(/Fechada no momento/);
    const error = new TRPCError({ code: "BAD_REQUEST", message: message ?? "" });
    expect(error.code).toBe("BAD_REQUEST");
  });
});
