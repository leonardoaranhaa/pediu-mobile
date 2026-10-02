import { describe, expect, it } from "vitest";

import {
  availableInventoryQuantity,
  inventoryReservationCutoff,
  inventoryAdjustmentForStatusChange,
  isPendingReservationExpired,
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

  it("expires only old pending reservations and keeps later states intact", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    const cutoff = inventoryReservationCutoff(now, 30 * 60_000);

    expect(cutoff.toISOString()).toBe("2026-09-30T11:30:00.000Z");
    expect(
      isPendingReservationExpired("Pendente", cutoff, now, 30 * 60_000),
    ).toBe(true);
    expect(
      isPendingReservationExpired(
        "Pendente",
        new Date("2026-09-30T11:30:00.001Z"),
        now,
        30 * 60_000,
      ),
    ).toBe(false);
    expect(
      isPendingReservationExpired("Aceito", cutoff, now, 30 * 60_000),
    ).toBe(false);
  });

  it("rejects a negative reservation TTL", () => {
    expect(() => inventoryReservationCutoff(new Date(), -1)).toThrow(
      "TTL de reserva inválido",
    );
  });
});
