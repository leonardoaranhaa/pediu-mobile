import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

describe("Pediu benefits catalog", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists coupons through the public benefits contract", async () => {
    const list = vi.spyOn(db, "listActiveCoupons").mockResolvedValue([
      {
        id: 1,
        code: "BEMVINDO10",
        type: "percentage",
        value: "10.00",
        minSubtotal: "20.00",
        maxDiscount: "15.00",
        active: 1,
        expiresAt: new Date(Date.now() + 60_000),
        usageLimit: null,
        perUserLimit: 1,
        usedCount: 0,
        ownerUserId: null,
        isPublic: 1,
        createdAt: new Date(),
      },
    ]);

    const result = await appRouter
      .createCaller({ user: null } as any)
      .pediu.coupons.available();

    expect(result[0]?.code).toBe("BEMVINDO10");
    expect(list).toHaveBeenCalledWith(30, undefined);
  });
});
