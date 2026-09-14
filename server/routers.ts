import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";

const orderStatusSchema = z.enum(["Pendente", "Preparando", "A caminho", "Entregue", "Cancelado"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  pediu: router({
    marketplace: router({
      products: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(({ input }) => db.listAvailableProducts(input?.category)),
    }),
    stores: router({
      mine: protectedProcedure.query(({ ctx }) => db.getStoreForOwner(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(32).optional(), address: z.string().max(255).optional(), pixKey: z.string().max(255).optional(), deliveryFee: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00") })).mutation(({ ctx, input }) => db.createStore({ ...input, ownerId: ctx.user.id })),
    }),
    products: router({
      mine: protectedProcedure.input(z.object({ storeId: z.number().int().positive() })).query(({ input }) => db.listProductsForStore(input.storeId)),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), name: z.string().min(2).max(180), category: z.string().min(2).max(80), description: z.string().max(1000).optional(), price: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(({ input }) => db.createProduct({ ...input, available: 1 })),
      availability: protectedProcedure.input(z.object({ productId: z.number().int().positive(), available: z.boolean() })).mutation(({ input }) => db.updateProductAvailability(input.productId, input.available)),
    }),
    orders: router({
      mine: protectedProcedure.query(({ ctx }) => db.listOrdersForCustomer(ctx.user.id)),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), total: z.string().regex(/^\d+(\.\d{1,2})?$/), deliveryAddress: z.string().max(255).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(50), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/) })).min(1) })).mutation(({ ctx, input }) => db.createOrder({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, input.items)),
      status: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema })).mutation(({ input }) => db.updateOrderStatus(input.orderId, input.status)),
    }),
    payments: router({
      createPix: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), pixKey: z.string().min(3).max(255) })).mutation(async ({ input }) => ({ paymentId: await db.createPendingPixPayment(input.orderId, input.pixKey), status: "pending" as const, message: "PIX criado e aguardando confirmação do gateway." })),
    }),
  }),
});

export type AppRouter = typeof appRouter;
