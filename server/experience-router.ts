import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { chatMessages, deliveryEvents, orderReviews } from "../drizzle/schema";

const target = z.enum(["store", "product", "courier"]);
const role = z.enum(["customer", "store", "courier", "support"]);

async function orderForUser(db: any, orderId: number, userId: number) {
  const rows = await db.select().from(db._.fullSchema.pediuOrders).where(and(eq(db._.fullSchema.pediuOrders.id, orderId), eq(db._.fullSchema.pediuOrders.customerId, userId))).limit(1);
  return rows[0];
}

export const experienceRouter = router({
  reviews: router({
    create: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), target, productId: z.number().int().positive().optional(), rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const order = await orderForUser(db, input.orderId, ctx.user.id); if (!order || order.status !== "Entregue") throw new Error("Pedido não elegível para avaliação");
      await db.insert(orderReviews).values({ ...input, userId: ctx.user.id }); return { success: true };
    }),
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const order = await orderForUser(db, input.orderId, ctx.user.id); if (!order) throw new Error("Pedido não encontrado"); return db.select().from(orderReviews).where(eq(orderReviews.orderId, input.orderId)); }),
  }),
  tracking: router({
    events: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await orderForUser(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(deliveryEvents).where(eq(deliveryEvents.orderId, input.orderId)).orderBy(desc(deliveryEvents.createdAt)); }),
    publish: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), eventType: z.string().min(1).max(32), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const order = await orderForUser(db, input.orderId, ctx.user.id); if (!order) throw new Error("Pedido não encontrado"); await db.insert(deliveryEvents).values(input); return { success: true }; }),
  }),
  chat: router({
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await orderForUser(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(chatMessages).where(eq(chatMessages.orderId, input.orderId)).orderBy(chatMessages.createdAt); }),
    send: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), role: role.default("customer"), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await orderForUser(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); await db.insert(chatMessages).values({ ...input, userId: ctx.user.id }); return { success: true }; }),
  }),
});
