import { describe, expect, it } from "vitest";

import { orderAcceptTimeoutMs } from "../server/domain/order-accept";
import {
  calculateServiceability,
  haversineDistanceKm,
} from "../server/domain/serviceability";
import {
  cardOnDeliveryRejection,
  sellingBlockReason,
  storePauseView,
} from "../server/domain/store-ops";

describe("store launch rules", () => {
  it("tells the customer when a paused store reopens", () => {
    const reopen = new Date("2026-10-25T18:45:00.000Z");
    const view = storePauseView(
      { pausedUntil: reopen, pauseManual: false },
      new Date("2026-10-25T18:30:00.000Z"),
    );
    expect(view.paused).toBe(true);
    expect(view.message).toMatch(/^Fechada no momento, volta às \d{2}:\d{2}$/);
  });

  it("reopens automatically after the pause time", () => {
    const view = storePauseView(
      { pausedUntil: new Date("2026-10-25T18:00:00.000Z"), pauseManual: false },
      new Date("2026-10-25T18:05:00.000Z"),
    );
    expect(view).toMatchObject({ paused: false, expired: true, message: null });
  });

  it("keeps a manual pause closed without a return time", () => {
    const view = storePauseView(
      { pausedUntil: null, pauseManual: true },
      new Date("2026-10-25T18:05:00.000Z"),
    );
    expect(view).toMatchObject({
      paused: true,
      message: "Fechada no momento",
      expired: false,
    });
  });

  it("blocks orders for a store still in review or paused", () => {
    expect(
      sellingBlockReason({
        approvalStatus: "pending",
        paused: false,
        pauseMessage: null,
      }),
    ).toBe("Esta loja ainda está em análise.");
    expect(
      sellingBlockReason({
        approvalStatus: "approved",
        paused: true,
        pauseMessage: "Fechada no momento, volta às 15:30",
      }),
    ).toBe("Fechada no momento, volta às 15:30");
    expect(
      sellingBlockReason({
        approvalStatus: "approved",
        paused: false,
        pauseMessage: null,
      }),
    ).toBeNull();
  });

  it("only allows card on delivery when the store turned it on", () => {
    const off = { cardCreditEnabled: false, cardDebitEnabled: true };
    expect(cardOnDeliveryRejection("card_credit", off)).toMatch(/crédito/);
    expect(cardOnDeliveryRejection("card_debit", off)).toBeNull();
    expect(cardOnDeliveryRejection("pix", off)).toBeNull();
  });

  it("adds a per-kilometer fee on top of the fixed delivery fee", () => {
    const store = {
      deliveryEnabled: 1,
      deliveryFee: "4.00",
      feeMode: "distance" as const,
      feePerKm: "2.50",
      deliveryRadiusKm: "8.00",
      latitude: "-23.550520",
      longitude: "-46.633308",
    };
    const address = { latitude: "-23.560000", longitude: "-46.640000" };
    const distance = haversineDistanceKm(
      { latitude: -23.55052, longitude: -46.633308 },
      { latitude: -23.56, longitude: -46.64 },
    );
    const result = calculateServiceability("delivery", store, address);
    expect(result.serviceable).toBe(true);
    expect(result.deliveryFee).toBe(
      (Math.round((4 + 2.5 * distance + Number.EPSILON) * 100) / 100).toFixed(2),
    );
  });

  it("keeps the fixed fee when distance pricing is off", () => {
    const result = calculateServiceability(
      "delivery",
      {
        deliveryEnabled: 1,
        deliveryFee: "7.50",
        feeMode: "fixed",
        feePerKm: "9.00",
        deliveryRadiusKm: "5.00",
        latitude: "-23.550520",
        longitude: "-46.633308",
      },
      { latitude: "-23.551000", longitude: "-46.634000" },
    );
    expect(result.deliveryFee).toBe("7.50");
  });

  it("defaults the unaccepted-order timeout to five minutes", () => {
    expect(orderAcceptTimeoutMs({})).toBe(5 * 60_000);
    expect(orderAcceptTimeoutMs({ ORDER_ACCEPT_TIMEOUT_MINUTES: "8" })).toBe(
      8 * 60_000,
    );
    expect(
      orderAcceptTimeoutMs({ INVENTORY_RESERVATION_TTL_MINUTES: "12" }),
    ).toBe(12 * 60_000);
  });
});
