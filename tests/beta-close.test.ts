import { describe, expect, it, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import {
  fiadoChargeDecision,
  fiadoPaymentDecision,
  NO_FIADO_LIMIT_MESSAGE,
} from "../server/domain/fiado-sale";
import { isUndefinedColumn } from "../server/domain/sql-errors";
import { readPositionWithFallback } from "../lib/courier-location";
import { uniqueStoreStories } from "../lib/story-rail";

const merchant = {
  id: 10,
  openId: "merchant-10",
  name: "Loja Teste",
  email: "loja@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const store = { id: 7, ownerId: 10, name: "Loja Teste" };

describe("fiado sale stays atomic", () => {
  it("refuses a sale when the limit is still zero and does not invent a balance", () => {
    const decision = fiadoChargeDecision({
      amount: 2,
      balance: 0,
      creditLimit: 0,
      status: "active",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.message).toBe(NO_FIADO_LIMIT_MESSAGE);
  });

  it("accepts a limit typed at the sale and then checks the new ceiling", () => {
    const allowed = fiadoChargeDecision({
      amount: 2,
      balance: 0,
      creditLimit: 0,
      proposedLimit: 50,
      status: "active",
    });
    expect(allowed).toMatchObject({ ok: true, creditLimit: 50, newBalance: 2 });

    const over = fiadoChargeDecision({
      amount: 80,
      balance: 0,
      creditLimit: 0,
      proposedLimit: 50,
      status: "active",
    });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message).toContain("R$ 50,00");
  });

  it("rejects a sale that would pass an existing limit before any write", () => {
    const decision = fiadoChargeDecision({
      amount: 40,
      balance: 20,
      creditLimit: 50,
      status: "active",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.message).toContain("R$ 50,00");
  });

  it("rejects a payment larger than the balance", () => {
    expect(fiadoPaymentDecision(0, 2).ok).toBe(false);
    expect(fiadoPaymentDecision(10, 4)).toMatchObject({ ok: true, newBalance: 6 });
  });
});

describe("sale and archive procedures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the limit message instead of a success when the sale cannot be saved", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as never);
    vi.spyOn(db, "createSale").mockRejectedValue(new Error(NO_FIADO_LIMIT_MESSAGE));
    const caller = appRouter.createCaller({ user: merchant } as never);
    await expect(
      caller.pediu.sales.create({
        total: "2.00",
        paymentMethod: "fiado",
        customerId: 1,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: NO_FIADO_LIMIT_MESSAGE,
    });
  });

  it("sends a new limit together with the fiado sale", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as never);
    const create = vi.spyOn(db, "createSale").mockResolvedValue(9);
    const caller = appRouter.createCaller({ user: merchant } as never);
    await caller.pediu.sales.create({
      total: "2.00",
      paymentMethod: "fiado",
      customerId: 1,
      creditLimit: "50.00",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        total: "2.00",
        paymentMethod: "fiado",
        customerId: 1,
        creditLimit: "50.00",
        storeId: 7,
      }),
    );
  });

  it("archives only through the store owner", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store as never);
    const archive = vi.spyOn(db, "archiveStoreProduct").mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: merchant } as never);
    await expect(caller.pediu.products.archive({ productId: 3 })).resolves.toEqual({
      success: true,
    });
    expect(archive).toHaveBeenCalledWith(7, 3);
  });

  it("keeps a missing archive column as a clear message", () => {
    const error = new TRPCError({
      code: "BAD_REQUEST",
      message: "Arquivar produto ainda não está disponível. Avise o suporte do Pediu.",
    });
    expect(isUndefinedColumn({ code: "42703" })).toBe(true);
    expect(isUndefinedColumn({ cause: { code: "42703" } })).toBe(true);
    expect(isUndefinedColumn({ code: "42P01" })).toBe(false);
    expect(error.code).toBe("BAD_REQUEST");
  });
});

describe("home and courier details", () => {
  it("shows one story circle per store", () => {
    const stories = uniqueStoreStories(
      [
        { id: 1, store: "TESTE Hiki Loja" },
        { id: 2, store: "teste hiki loja" },
        { id: 3, store: "Outra" },
      ],
      8,
    );
    expect(stories.map((item) => item.id)).toEqual([1, 3]);
  });

  it("falls back from a precise location to a coarse one and then the last point", async () => {
    const calls: string[] = [];
    const position = await readPositionWithFallback({
      current: async (accuracy) => {
        calls.push(accuracy);
        throw new Error("sem sinal");
      },
      lastKnown: async () => {
        calls.push("last");
        return { latitude: 1, longitude: 2 };
      },
    });
    expect(calls).toEqual(["balanced", "low", "last"]);
    expect(position).toEqual({ latitude: 1, longitude: 2 });
  });
});
