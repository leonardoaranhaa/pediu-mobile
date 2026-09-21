import { createHash, randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { coupons, orders, orderItems, payments, products, stores } from "../drizzle/schema";
import { courierAssignments, courierProfiles, mfaChallenges } from "../drizzle/experience-schema";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function sendCode(channel: string, destination: string, code: string) {
  const url = process.env.MFA_DELIVERY_URL;
  if (!url) throw new Error("MFA_DELIVERY_URL não configurado");
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(process.env.MFA_DELIVERY_TOKEN ? { authorization: `Bearer ${process.env.MFA_DELIVERY_TOKEN}` } : {}) }, body: JSON.stringify({ channel, destination, code }) });
  if (!res.ok) throw new Error(`Falha no provedor MFA: ${res.status}`);
}

export const experienceExtensionsRouter = router({
  mfa: router({
    request: protectedProcedure.input(z.object({ channel: z.enum(["sms", "whatsapp", "email"]), destination: z.string().trim().min(3).max(320) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const code = String(randomInt(100000, 1000000)); const expiresAt = new Date(Date.now() + 5 * 60_000);
      const result = await db.insert(mfaChallenges).values({ userId: ctx.user.id, channel: input.channel, destination: input.destination, codeHash: hash(code), expiresAt });
      const id = Number((result as any).insertId);
      try { await sendCode(input.channel, input.destination, code); } catch (error) { await db.delete(mfaChallenges).where(eq(mfaChallenges.id, id)); throw error; }
      return { challengeId: id, expiresAt };
    }),
    verify: protectedProcedure.input(z.object({ challengeId: z.number().int().positive(), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const rows = await db.select().from(mfaChallenges).where(and(eq(mfaChallenges.id, input.challengeId), eq(mfaChallenges.userId, ctx.user.id))).limit(1); const challenge = rows[0];
      if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= 5) throw new Error("Código MFA expirado ou inválido");
      if (hash(input.code) !== challenge.codeHash) { await db.update(mfaChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(mfaChallenges.id, challenge.id)); throw new Error("Código MFA incorreto"); }
      await db.update(mfaChallenges).set({ consumedAt: new Date() }).where(eq(mfaChallenges.id, challenge.id)); return { verified: true };
    }),
  }),
  coupons: router({
    createOrder: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), paymentMethod: z.enum(["pix", "card", "cash"]).default("pix"), deliveryAddress: z.string().max(255).optional(), couponCode: z.string().trim().max(40).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(50) })).min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const store = (await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1))[0]; if (!store || !store.isOpen) throw new Error("Estabelecimento indisponível");
      const priced = await Promise.all(input.items.map(async item => (await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.storeId, input.storeId), eq(products.available, 1))).limit(1))[0]));
      if (priced.some(p => !p)) throw new Error("Produto indisponível");
      const subtotalCents = input.items.reduce((sum, item, i) => sum + Math.round(Number(priced[i]!.price) * 100) * item.quantity, 0);
      let discountCents = 0;
      if (input.couponCode) { const coupon = (await db.select().from(coupons).where(eq(coupons.code, input.couponCode.toUpperCase())).limit(1))[0]; if (!coupon || coupon.active !== 1 || (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now())) throw new Error("Cupom inválido ou expirado"); if (subtotalCents < Math.round(Number(coupon.minSubtotal) * 100)) throw new Error("Valor mínimo do cupom não atingido"); const raw = coupon.type === "percentage" ? Math.round(subtotalCents * Number(coupon.value) / 100) : Math.round(Number(coupon.value) * 100); discountCents = Math.min(raw, subtotalCents, coupon.maxDiscount == null ? raw : Math.round(Number(coupon.maxDiscount) * 100)); }
      const deliveryCents = Math.round(Number(store.deliveryFee ?? 0) * 100); const total = ((subtotalCents - discountCents + deliveryCents) / 100).toFixed(2);
      return db.transaction(async tx => { const orderResult = await tx.insert(orders).values({ customerId: ctx.user.id, storeId: input.storeId, total, deliveryAddress }); const orderId = Number((orderResult as any).insertId); await tx.insert(orderItems).values(input.items.map((item, i) => ({ orderId, productId: item.productId, quantity: item.quantity, unitPrice: String(priced[i]!.price) }))); const paymentResult = await tx.insert(payments).values({ orderId, method: input.paymentMethod, status: "pending" }); return { orderId, paymentId: Number((paymentResult as any).insertId), subtotal: (subtotalCents / 100).toFixed(2), discount: (discountCents / 100).toFixed(2), delivery: (deliveryCents / 100).toFixed(2), total }; });
    }),
  }),
  couriers: router({
    assign: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), courierUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const order = (await db.select({ order: orders }).from(orders).innerJoin(stores, eq(stores.id, orders.storeId)).where(and(eq(orders.id, input.orderId), eq(stores.ownerId, ctx.user.id))).limit(1))[0]?.order; if (!order) throw new Error("Pedido não autorizado"); const courier = (await db.select().from(courierProfiles).where(and(eq(courierProfiles.userId, input.courierUserId), eq(courierProfiles.active, 1))).limit(1))[0]; if (!courier) throw new Error("Entregador não encontrado"); await db.update(courierAssignments).set({ active: 0 }).where(and(eq(courierAssignments.orderId, input.orderId), eq(courierAssignments.active, 1))); await db.insert(courierAssignments).values({ orderId: input.orderId, courierUserId: input.courierUserId, active: 1 }); return { success: true }; }),
    canPublish: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const assigned = (await db.select().from(courierAssignments).where(and(eq(courierAssignments.orderId, input.orderId), eq(courierAssignments.courierUserId, ctx.user.id), eq(courierAssignments.active, 1))).limit(1))[0]; const owner = (await db.select({ id: stores.id }).from(stores).innerJoin(orders, eq(orders.storeId, stores.id)).where(and(eq(orders.id, input.orderId), eq(stores.ownerId, ctx.user.id))).limit(1))[0]; return { allowed: Boolean(assigned || owner) }; }),
  }),
});
