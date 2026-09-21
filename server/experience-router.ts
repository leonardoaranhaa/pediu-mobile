import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { coupons, orders, orderReviews, deliveryEvents, chatMessages } from "../drizzle/schema";
import { calculateCouponDiscount } from "./domain/coupons";

async function ownedOrder(db: any, orderId: number, userId: number) {
  const rows = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, userId))).limit(1);
  return rows[0];
}

export const experienceRouter = router({
  coupons: router({
    validate: protectedProcedure.input(z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().nonnegative() })).query(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const rows = await db.select().from(coupons).where(eq(coupons.code, input.code.toUpperCase())).limit(1);
      return calculateCouponDiscount(rows[0], input.subtotal);
    }),
  }),
  reviews: router({
    create: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), target: z.enum(["store", "product", "courier"]), productId: z.number().int().positive().optional(), rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const order = await ownedOrder(db, input.orderId, ctx.user.id); if (!order || order.status !== "Entregue") throw new Error("Pedido não elegível para avaliação"); await db.insert(orderReviews).values({ ...input, userId: ctx.user.id }); return { success: true }; }),
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(orderReviews).where(eq(orderReviews.orderId, input.orderId)); }),
  }),
  tracking: router({
    events: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(deliveryEvents).where(eq(deliveryEvents.orderId, input.orderId)).orderBy(desc(deliveryEvents.createdAt)); }),
  }),
  chat: router({
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(chatMessages).where(eq(chatMessages.orderId, input.orderId)).orderBy(chatMessages.createdAt); }),
    send: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); await db.insert(chatMessages).values({ orderId: input.orderId, userId: ctx.user.id, role: "customer", body: input.body }); return { success: true }; }),
  }),
});
