import { describe, expect, it } from "vitest";
import { classifyPendingOrder, PIX_TTL_MS } from "../server/pix-lifecycle";
import { phraseMatchesName, splitOrderPhrase } from "../server/assistant-match";
import { defaultOptionSelection, groupRequiresChoice } from "../lib/option-selection";

describe("PIX lifetime", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("keeps an unpaid PIX inside the charge window and expires it after", () => {
    expect(
      classifyPendingOrder({
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
        updatedAt: now,
        paymentMethod: "pix",
        paymentStatus: "pending",
        now,
        acceptTtlMs: 5 * 60 * 1000,
        pixTtlMs: PIX_TTL_MS,
      }),
    ).toBe("keep");
    expect(
      classifyPendingOrder({
        createdAt: new Date(now.getTime() - PIX_TTL_MS - 1000),
        updatedAt: now,
        paymentMethod: "pix",
        paymentStatus: "pending",
        now,
        acceptTtlMs: 5 * 60 * 1000,
        pixTtlMs: PIX_TTL_MS,
      }),
    ).toBe("pix_expired");
  });

  it("starts the store accept clock when the PIX is paid", () => {
    expect(
      classifyPendingOrder({
        createdAt: new Date(now.getTime() - 20 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 60 * 1000),
        paymentMethod: "pix",
        paymentStatus: "paid",
        now,
        acceptTtlMs: 5 * 60 * 1000,
        pixTtlMs: PIX_TTL_MS,
      }),
    ).toBe("keep");
  });
});

describe("assistant name matching", () => {
  it("treats grande as a size and pizza as the product", () => {
    expect(splitOrderPhrase("pizza grande da TESTE Hiki Loja")).toEqual({
      productWords: ["pizza", "teste", "hiki"],
      optionWords: ["grande"],
    });
    expect(phraseMatchesName("pizza grande", "TESTE Hiki Pizza")).toBe(true);
    expect(phraseMatchesName("pizza", "TESTE Hiki Pizza")).toBe(true);
  });
});

describe("required options", () => {
  it("preselects the first required size and updates the chosen price input", () => {
    const groups = [
      {
        id: 3,
        name: "Tamanho",
        required: 0,
        choices: [
          { id: 8, priceDelta: "0.00" },
          { id: 9, priceDelta: "10.00" },
        ],
      },
    ];
    expect(groupRequiresChoice(groups[0])).toBe(true);
    expect(defaultOptionSelection(groups)).toEqual({ 3: 8 });
  });
});
