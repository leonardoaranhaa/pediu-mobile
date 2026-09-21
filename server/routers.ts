import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { addressRouter } from "./address-router";
import { experienceRouter } from "./experience-router";
import { adminRouter } from "./admin-router";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  address: addressRouter,
  pediu: router({
    experience: experienceRouter,
    marketplace: router({
      products: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(({ input }) => db.listAvailableProducts(input?.category)),
    }),
    stores: router({
      mine: protectedProcedure.query(({ ctx }) => db.getStoreForOwner(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(32).optional(), address: z.string().max(255).optional(), pixKey: z.string().max(255).optional(), deliveryFee: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00") })).mutation(({ ctx, input }) => db.createStore({ ...input, ownerId: ctx.user.id })),
    }),
    products: router({
      mine: protectedProcedure.input(z.object({ storeId: z.number().int().positive() })).query(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); return store?.id === input.storeId ? db.listProductsForStore(input.storeId) : []; }),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), name: z.string().min(2).max(180), category: z.string().min(2).max(80), description: z.string().max(1000).optional(), price: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); if (store?.id !== input.storeId) throw new Error("Loja não autorizada"); return db.createProduct({ ...input, available: 1 }); }),
      availability: protectedProcedure.input(z.object({ productId: z.number().int().positive(), available: z.boolean() })).mutation(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); if (!store) throw new Error("Loja não encontrada"); const product = await db.getProductForStore(input.productId, store.id); if (!product) throw new Error("Produto não pertence à sua loja"); return db.updateProductAvailability(input.productId, input.available); }),
      storeOpen: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), isOpen: z.boolean() })).mutation(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); if (!store || store.id !== input.storeId) throw new Error("Loja não autorizada"); return db.updateStoreOpen(input.storeId, input.isOpen); }),
    }),
    orders: router({
      mine: protectedProcedure.query(({ ctx }) => db.listOrdersForCustomer(ctx.user.id)),
      get: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { const order = await db.getOrderForUser(input.orderId, ctx.user.id); if (!order) throw new Error("Pedido não encontrado ou não autorizado"); return order; }),
      storeMine: protectedProcedure.query(async ({ ctx }) => { const store = await db.getStoreForOwner(ctx.user.id); return store ? db.listOrdersForStore(store.id) : []; }),
    }),
  }),
});
export type AppRouter = typeof appRouter;
