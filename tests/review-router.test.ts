import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const customer = { id: 20, openId: "customer-20", name: "Cliente", email: "customer@test.local", loginMethod: "test", role: "user" as const, lastSignedIn: new Date() };
const delivered = { id: 101, customerId: 20, storeId: 7, status: "Entregue" as const } as any;
const pending = { ...delivered, status: "Pronto" as const };
const review = { id: 401, orderId: 101, userId: 20, target: "store", productId: null, rating: 5, comment: "Ótimo", idempotencyKey: "review-101-store", createdAt: new Date() } as any;

describe("Pediu post-delivery reviews contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects feedback before the order is delivered", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(pending);
    const caller = appRouter.createCaller({ user: customer } as any);
    await expect(caller.pediu.experience.reviews.create({ orderId: 101, target: "store", rating: 5, idempotencyKey: "review-101-store" })).rejects.toThrow("não elegível");
  });

  it("creates an eligible review with its stable key", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(delivered);
    vi.spyOn(db, "getOrderReviewByIdempotencyKey").mockResolvedValue(undefined);
    const create = vi.spyOn(db, "createOrderReview").mockResolvedValue({ id: 401, duplicate: false });
    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.reviews.create({ orderId: 101, target: "store", rating: 5, comment: "Ótimo", idempotencyKey: "review-101-store" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ orderId: 101, userId: 20, target: "store", idempotencyKey: "review-101-store" }));
    expect(result).toEqual({ success: true, reviewId: 401, duplicate: false });
  });

  it("returns the existing review on a repeated key", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(delivered);
    vi.spyOn(db, "getOrderReviewByIdempotencyKey").mockResolvedValue(review);
    const create = vi.spyOn(db, "createOrderReview").mockResolvedValue({ id: 999, duplicate: false });
    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.reviews.create({ orderId: 101, target: "store", rating: 5, idempotencyKey: "review-101-store" });
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, reviewId: 401, duplicate: true });
  });

  it("lists reviews only through the authenticated order owner", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(delivered);
    const list = vi.spyOn(db, "listOrderReviews").mockResolvedValue([review]);
    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.reviews.list({ orderId: 101 });
    expect(list).toHaveBeenCalledWith(101);
    expect(result[0].rating).toBe(5);
  });
});
