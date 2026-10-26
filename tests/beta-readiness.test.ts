import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  brlInputToDecimal,
  decimalToBrlInput,
  decimalToKmInput,
  kmInputToDecimal,
  maskBrazilPhone,
  maskBrlTyping,
} from "../lib/br-fields";
import { homeContextForHour } from "../lib/home-context";
import {
  MASCOT_MAX_TILT_DEGREES,
  MASCOT_VIEWBOX,
  mascotBox,
  mascotExpression,
} from "../lib/mascot-frame";
import { sceneForReaction } from "../lib/mascot-scenes";
import { bottomSafeInset } from "../lib/screen-space";
import { friendlyUserMessage } from "../lib/user-message";
import { publicError } from "../server/_core/public-error";

describe("beta field formatting", () => {
  it("masks a stored phone and money the way the lojista screen shows them", () => {
    expect(maskBrazilPhone("14981104964")).toBe("(14) 98110-4964");
    expect(decimalToBrlInput("0.00")).toBe("0,00");
    expect(decimalToBrlInput("10.5")).toBe("10,50");
    expect(maskBrlTyping("R$ 12,345")).toBe("12,34");
    expect(brlInputToDecimal("5,00")).toBe("5.00");
    expect(decimalToKmInput("10.00")).toBe("10");
    expect(kmInputToDecimal("10")).toBe("10.00");
    expect(kmInputToDecimal("0")).toBe("");
  });
});

describe("beta home copy", () => {
  it("explains lunch without the old stacked sentence", () => {
    const lunch = homeContextForHour(12);
    expect(lunch.focusDescription).toBe(
      "Restaurantes primeiro. O mercado continua fácil de achar.",
    );
    expect(lunch.focusDescription).not.toMatch(/lideram|Mercado Pediu/);
    expect(lunch.subtitle.length).toBeLessThan(80);
  });
});

describe("beta mascot frame", () => {
  it("keeps one aspect ratio and an upright hungry pose", () => {
    const compact = mascotBox(true);
    const regular = mascotBox(false);
    const ratio = MASCOT_VIEWBOX.width / MASCOT_VIEWBOX.height;
    expect(compact.width / compact.height).toBeCloseTo(ratio, 2);
    expect(regular.width / regular.height).toBeCloseTo(ratio, 2);
    expect(MASCOT_MAX_TILT_DEGREES).toBe(0);
    expect(sceneForReaction("hungry").gesture).toBe("stand");
    expect(mascotExpression("hungry", "lie").hands).toBe(false);
    expect(mascotExpression("avoid", "coverEyes").hands).toBe(true);
  });
});

describe("beta safe area", () => {
  it("lifts controls above both gesture and 3-button navigation", () => {
    expect(bottomSafeInset(0, "android")).toBe(64);
    expect(bottomSafeInset(48, "android")).toBe(64);
    expect(bottomSafeInset(24, "android")).toBe(40);
    expect(bottomSafeInset(34, "ios")).toBe(42);
  });
});

describe("beta public errors", () => {
  it("hides database failures and keeps a normal message", () => {
    expect(friendlyUserMessage("Failed query: insert into pediu_orders")).toMatch(
      /Tente de novo/,
    );
    expect(friendlyUserMessage("Informe o nome da loja.")).toBe(
      "Informe o nome da loja.",
    );
    expect(
      publicError(new TRPCError({ code: "BAD_REQUEST", message: "fora da área" }))
        .message,
    ).toBe("fora da área");
    expect(publicError(new Error("connect ECONNREFUSED")).message).toMatch(
      /Tente de novo/,
    );
  });
});
