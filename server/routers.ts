import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { addressRouter } from "./address-router";
import { interpretVoiceCommand } from "./voice";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storageGetSignedUrl, storagePut } from "./storage";
import { sendPushToUser } from "./push";
import { createPixCharge } from "./payments";
import { canCustomerCancelOrder, canTransitionOrder } from "./order-state";
import { adminRouter } from "./admin-router";

const orderStatusSchema = z.enum(["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue", "Cancelado"]);

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  address: addressRouter,
  pediu: router({
    marketplace: router({ products: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(({ input }) => db.listAvailableProducts(input?.category)) }),
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
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), total: z.string().regex(/^\d+(\.\d{1,2})?$/), paymentMethod: z.enum(["pix", "card", "cash", "fiado"]).default("pix"), deliveryAddress: z.string().max(255).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(50), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/) })).min(1) })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId); if (!store) throw new Error("Estabelecimento não encontrado"); if (!store.isOpen) throw new Error("Estabelecimento fechado no momento");
        const products = await Promise.all(input.items.map((item) => db.getAvailableProductForStore(item.productId, input.storeId))); if (products.some((p) => !p)) throw new Error("Há produto inválido ou de outro estabelecimento");
        const calculated = input.items.reduce((sum, item, i) => sum + Number(products[i]!.price) * item.quantity, 0) + Number(store.deliveryFee ?? 0); if (Math.abs(calculated - Number(input.total)) > 0.01) throw new Error("Total do pedido inválido");
        const items = input.items.map((item, i) => ({ productId: item.productId, quantity: item.quantity, unitPrice: String(products[i]!.price) }));
        if (input.paymentMethod === "fiado") { const customer = await db.getCustomerCreditByUser(input.storeId, ctx.user.id); if (!customer) throw new Error("Cliente não habilitado para fiado nesta loja"); const orderId = await db.createOrderWithFiado({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, items, customer.id, input.storeId); return { orderId, paymentId: null, status: "Pendente" as const }; }
        const { orderId, paymentId } = await db.createOrderWithPayment({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, items, input.paymentMethod); return { orderId, paymentId, status: "Pendente" as const };
      }),
      status: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema })).mutation(async ({ ctx, input }) => { const order = await db.getOrderForUser(input.orderId, ctx.user.id); if (!order) throw new Error("Pedido não encontrado ou não autorizado"); const isOwner = (await db.getStoreForOwner(ctx.user.id))?.id === order.storeId; if (!isOwner && input.status !== "Cancelado") throw new Error("Status não autorizado para cliente"); if (!isOwner && !canCustomerCancelOrder(order.status)) throw new Error("Pedido não pode mais ser cancelado"); if (isOwner && !canTransitionOrder(order.status, input.status)) throw new Error("Transição de status inválida"); await db.updateOrderStatus(input.orderId, input.status); return { success: true }; }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
