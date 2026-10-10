import { afterEach, describe, expect, it, vi } from "vitest";
import { prioritizeFlashDeliveryQueue, suggestedFlashEtaMinutes } from "../server/domain/delivery-queue";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

describe("Flash delivery queue prioritization", () => {
  afterEach(() => vi.restoreAllMocks());

  it("orders Flash ahead of standard, then oldest first", () => {
    const sorted = prioritizeFlashDeliveryQueue([
      { id: 3, status: "Pronto", isFlash: 0, updatedAt: new Date("2026-10-04T12:00:00Z") },
      { id: 1, status: "Pronto", isFlash: 1, updatedAt: new Date("2026-10-04T12:05:00Z") },
      { id: 2, status: "A caminho", isFlash: 1, updatedAt: new Date("2026-10-04T11:50:00Z") },
      { id: 9, status: "Preparando", isFlash: 1, updatedAt: new Date("2026-10-04T11:00:00Z") },
    ]);

    expect(sorted.map((order) => order.id)).toEqual([2, 1, 3]);
  });

  it("suggests Flash ETA from store when courier omits minutes", () => {
    expect(suggestedFlashEtaMinutes({ isFlash: 1 }, { flashEtaMaxMinutes: 18 })).toBe(18);
    expect(suggestedFlashEtaMinutes({ isFlash: 1 }, null)).toBe(20);
    expect(suggestedFlashEtaMinutes({ isFlash: 0 }, { flashEtaMaxMinutes: 18 })).toBeUndefined();
    expect(suggestedFlashEtaMinutes({ isFlash: 1 }, { flashEtaMaxMinutes: 18 }, 12)).toBe(12);
  });

  it("exposes delivery.queue with Flash-first ordering for store owners", async () => {
    const merchant = {
      id: 10,
      openId: "merchant-10",
      name: "Operador Loja",
      email: "merchant@test.local",
      loginMethod: "test",
      role: "merchant" as const,
      lastSignedIn: new Date(),
    };
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({ id: 7, ownerId: 10, flashEtaMaxMinutes: 22 } as any);
    vi.spyOn(db, "listOrdersForStore").mockResolvedValue([
      { id: 30, status: "Pronto", isFlash: 0, fulfillment: "standard", tipAmount: "0.00", total: "40.00", deliveryAddress: "Rua A", updatedAt: new Date("2026-10-04T12:00:00Z") },
      { id: 31, status: "Pronto", isFlash: 1, fulfillment: "flash", tipAmount: "2.00", total: "55.00", deliveryAddress: "Rua B", updatedAt: new Date("2026-10-04T12:10:00Z") },
    ] as any);

    const result = await appRouter.createCaller({ user: merchant } as any).pediu.experience.delivery.queue();
    expect(result.queue.map((order) => order.id)).toEqual([31, 30]);
    expect(result.queue[0]).toMatchObject({ isFlash: true, suggestedEtaMinutes: 22 });
    expect(result.flashCount).toBe(1);
  });

  it("assigns Flash orders with suggested ETA when none is provided", async () => {
    const merchant = {
      id: 10,
      openId: "merchant-10",
      name: "Operador Loja",
      email: "merchant@test.local",
      loginMethod: "test",
      role: "merchant" as const,
      lastSignedIn: new Date(),
    };
    const flashOrder = { id: 101, customerId: 20, storeId: 7, status: "Pronto" as const, total: "35.00", isFlash: 1 };
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(flashOrder as any);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({ id: 7, ownerId: 10, flashEtaMaxMinutes: 19 } as any);
    const save = vi.spyOn(db, "upsertDeliveryAssignment").mockResolvedValue({ id: 501, orderId: 101 } as any);

    await appRouter.createCaller({ user: merchant } as any).pediu.experience.delivery.assign({ orderId: 101 });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ orderId: 101, etaMinutes: 19 }));
  });
});
