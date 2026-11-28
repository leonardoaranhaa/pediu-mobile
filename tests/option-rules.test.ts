import { describe, expect, it } from "vitest";
import {
  missingOptionChoice,
  optionGroupHint,
  optionGroupLimits,
  toggleOptionChoice,
} from "../shared/option-rules";
import { priceSelectedOptions } from "../server/domain/order-options";

const point = {
  id: 1,
  name: "Ponto da carne",
  required: 1,
  minChoices: 1,
  maxChoices: 1,
  choices: [
    { id: 11, name: "Mal passado", priceDelta: "0.00" },
    { id: 12, name: "Ao ponto", priceDelta: "0.00" },
  ],
};
const extras = {
  id: 2,
  name: "Adicionais",
  required: 0,
  minChoices: 0,
  maxChoices: 3,
  choices: [
    { id: 21, name: "Bacon", priceDelta: "5.00" },
    { id: 22, name: "Ovo", priceDelta: "2.00" },
    { id: 23, name: "Cheddar", priceDelta: "4.00" },
    { id: 24, name: "Cebola", priceDelta: "1.00" },
  ],
};

describe("add-on group rules", () => {
  it("reads limits and hints", () => {
    expect(optionGroupLimits(point)).toEqual({ min: 1, max: 1 });
    expect(optionGroupLimits(extras)).toEqual({ min: 0, max: 3 });
    expect(optionGroupHint(point)).toBe("obrigatório · escolha 1");
    expect(optionGroupHint(extras)).toBe("opcional · até 3");
  });

  it("starts empty and asks for the required group", () => {
    expect(missingOptionChoice([point, extras], {})?.message).toBe(
      "Escolha Ponto da carne para continuar.",
    );
  });

  it("swaps a single choice and clears it on a second tap", () => {
    let sel = toggleOptionChoice({}, point, 11).selection;
    sel = toggleOptionChoice(sel, point, 12).selection;
    expect(sel[1]).toEqual([12]);
    expect(toggleOptionChoice(sel, point, 12).selection[1]).toEqual([]);
  });

  it("keeps several add-ons up to the maximum", () => {
    let sel = {};
    for (const id of [21, 22, 23]) sel = toggleOptionChoice(sel, extras, id).selection;
    const blocked = toggleOptionChoice(sel, extras, 24);
    expect(blocked.selection).toBe(sel);
    expect(blocked.notice).toBe("Em Adicionais, escolha até 3 opções.");
  });

  it("prices bacon and egg together on the server", () => {
    const priced = priceSelectedOptions("30.00", [point, extras], [12, 21, 22]);
    expect(priced).toEqual({
      ok: true,
      unitPrice: "37.00",
      label: "Ponto da carne: Ao ponto · Adicionais: Bacon, Ovo",
      optionIds: [12, 21, 22],
    });
  });

  it("refuses more add-ons than allowed and a missing required choice", () => {
    expect(priceSelectedOptions("30.00", [point, extras], [12, 21, 22, 23, 24]).ok).toBe(false);
    expect(priceSelectedOptions("30.00", [point, extras], [21])).toEqual({
      ok: false,
      message: "Escolha Ponto da carne para continuar.",
    });
  });

  it("enforces a minimum above one", () => {
    const flavors = { ...extras, id: 3, name: "Sabores", required: 1, minChoices: 2, maxChoices: 2 };
    expect(priceSelectedOptions("40.00", [flavors], [21]).ok).toBe(false);
    expect(priceSelectedOptions("40.00", [flavors], [21, 22]).ok).toBe(true);
  });
});

import { cartOptionsLabel } from "../lib/cart";

describe("bag add-on label", () => {
  it("lists several add-ons under one group name", () => {
    expect(
      cartOptionsLabel([
        { id: 2, groupId: 1, groupName: "Ponto da carne", name: "Ao ponto", priceDelta: "0" },
        { id: 7, groupId: 2, groupName: "Adicionais", name: "Bacon", priceDelta: "5" },
        { id: 6, groupId: 2, groupName: "Adicionais", name: "Ovo", priceDelta: "2" },
      ]),
    ).toBe("Ponto da carne: Ao ponto · Adicionais: Bacon, Ovo");
  });
});
