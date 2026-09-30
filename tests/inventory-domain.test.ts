import { describe, expect, it } from "vitest";

import {
  availableInventoryQuantity,
  inventoryAdjustmentForStatusChange,
  normalizeInventoryQuantity,
} from "../server/domain/inventory";

describe("inventory domain", () => {
  it("calculates only the unreserved quantity as available", () => {
    expect(availableInventoryQuantity(10, 3)).toBe(7);
    expect(availableInventoryQuantity(2, 5)).toBe(0);
  });

  it("maps terminal order transitions to one inventory adjustment", () => {
    expect(inventoryAdjustmentForStatusChange("Pronto", "Cancelado")).toBe(
      "release",
    );
    expect(inventoryAdjustmentForStatusChange("A caminho", "Entregue")).toBe(
      "consume",
    );
    expect(inventoryAdjustmentForStatusChange("Pendente", "Aceito")).toBe(
      "none",
    );
    expect(inventoryAdjustmentForStatusChange("Cancelado", "Cancelado")).toBe(
      "none",
    );
  });

  it("accepts bounded integer quantities and rejects unsafe values", () => {
    expect(normalizeInventoryQuantity(0)).toBe(0);
    expect(normalizeInventoryQuantity(25)).toBe(25);
    expect(() => normalizeInventoryQuantity(-1)).toThrow(
      "Quantidade de estoque inválida",
    );
    expect(() => normalizeInventoryQuantity(1.5)).toThrow(
      "Quantidade de estoque inválida",
    );
    expect(() => normalizeInventoryQuantity(1_000_001)).toThrow(
      "Quantidade de estoque inválida",
    );
  });
});
