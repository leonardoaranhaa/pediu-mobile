import { describe, expect, it } from "vitest";
import {
  composeItemNote,
  paymentMethodLabel,
  priceSelectedOptions,
  type PricedOptionGroup,
} from "../server/domain/order-options";

const groups: PricedOptionGroup[] = [
  {
    id: 1,
    name: "Tamanho",
    required: 0,
    choices: [
      { id: 11, name: "Broto", priceDelta: "0.00" },
      { id: 12, name: "Grande", priceDelta: "10.00" },
    ],
  },
];

describe("order option pricing", () => {
  it("adds the selected extra to the base price and keeps the label", () => {
    const priced = priceSelectedOptions("40.00", groups, [12]);
    expect(priced).toEqual({
      ok: true,
      unitPrice: "50.00",
      label: "Tamanho: Grande",
      optionIds: [12],
    });
  });

  it("keeps the base price when the product has no options", () => {
    const priced = priceSelectedOptions("25.00", [], undefined);
    expect(priced.ok).toBe(true);
    if (priced.ok) expect(priced.unitPrice).toBe("25.00");
  });

  it("rejects an option that does not belong to the product", () => {
    const priced = priceSelectedOptions("40.00", groups, [99]);
    expect(priced).toEqual({
      ok: false,
      message: "Essa opção não faz parte deste produto.",
    });
  });

  it("rejects two choices from the same group", () => {
    const priced = priceSelectedOptions("40.00", groups, [11, 12]);
    expect(priced.ok).toBe(false);
    if (!priced.ok) expect(priced.message).toContain("Tamanho");
  });

  it("requires a choice when the group is required", () => {
    const required: PricedOptionGroup[] = [{ ...groups[0], required: 1 }];
    const priced = priceSelectedOptions("40.00", required, []);
    expect(priced).toEqual({
      ok: false,
      message: "Escolha Tamanho para continuar.",
    });
  });

  it("stores the option label with the customer note without repeating it", () => {
    expect(composeItemNote("Tamanho: Grande", "sem cebola")).toBe(
      "Tamanho: Grande. sem cebola",
    );
    expect(composeItemNote("Tamanho: Grande", "Tamanho: Grande. sem cebola")).toBe(
      "Tamanho: Grande. sem cebola",
    );
    expect(composeItemNote("", "capricha")).toBe("capricha");
  });

  it("names the payment method in plain Portuguese", () => {
    expect(paymentMethodLabel("cash")).toBe("Dinheiro");
    expect(paymentMethodLabel("pix")).toBe("PIX");
    expect(paymentMethodLabel(null)).toBe("Pagamento a confirmar");
  });
});
