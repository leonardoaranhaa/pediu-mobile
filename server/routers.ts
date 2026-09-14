import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { interpretVoiceCommand } from "./voice";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storageGetSignedUrl, storagePut } from "./storage";
import { sendPushToUser } from "./push";

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
      mine: protectedProcedure.input(z.object({ storeId: z.number().int().positive() })).query(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); return store?.id === input.storeId ? db.listProductsForStore(input.storeId) : []; }),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), name: z.string().min(2).max(180), category: z.string().min(2).max(80), description: z.string().max(1000).optional(), price: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(async ({ ctx, input }) => { const store = await db.getStoreForOwner(ctx.user.id); if (store?.id !== input.storeId) throw new Error("Loja não autorizada"); return db.createProduct({ ...input, available: 1 }); }),
      availability: protectedProcedure.input(z.object({ productId: z.number().int().positive(), available: z.boolean() })).mutation(({ input }) => db.updateProductAvailability(input.productId, input.available)),
    }),
    orders: router({
      mine: protectedProcedure.query(({ ctx }) => db.listOrdersForCustomer(ctx.user.id)),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), total: z.string().regex(/^\d+(\.\d{1,2})?$/), deliveryAddress: z.string().max(255).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(50), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/) })).min(1) })).mutation(({ ctx, input }) => db.createOrder({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, input.items)),
      status: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema })).mutation(({ input }) => db.updateOrderStatus(input.orderId, input.status)),
    }),
    payments: router({
      createPix: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), pixKey: z.string().min(3).max(255) })).mutation(async ({ input }) => ({ paymentId: await db.createPendingPixPayment(input.orderId, input.pixKey), status: "pending" as const, message: "PIX criado e aguardando confirmação do gateway." })),
      confirm: protectedProcedure.input(z.object({ paymentId: z.number().int().positive(), gatewayStatus: z.enum(["pending", "paid", "failed"]) })).mutation(async ({ ctx, input }) => { const message = input.gatewayStatus === "paid" ? "Pagamento confirmado pelo gateway." : input.gatewayStatus === "failed" ? "O gateway informou falha no pagamento." : "Pagamento ainda aguardando confirmação do gateway."; await sendPushToUser(ctx.user.id, "Atualização do pagamento", message, { paymentId: input.paymentId, status: input.gatewayStatus }); return { paymentId: input.paymentId, status: input.gatewayStatus, message }; }),
    }),
    clients: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listCustomersForStore(store.id) : [];
      }),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(32).optional(), notes: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Cadastre sua loja antes de criar clientes");
        return db.createCustomer({ ...input, storeId: store.id });
      }),
    }),
    ledger: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listLedgerEntriesForStore(store.id) : [];
      }),
      add: protectedProcedure.input(z.object({ customerId: z.number().int().positive(), type: z.enum(["credit", "payment"]), amount: z.string().regex(/^\d+(\.\d{1,2})?$/), note: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Cadastre sua loja antes de lançar fiado");
        return db.createLedgerEntry({ ...input, storeId: store.id });
      }),
    }),
    sales: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listSalesForStore(store.id) : [];
      }),
      create: protectedProcedure.input(z.object({ customerId: z.number().int().positive().optional(), total: z.string().regex(/^\d+(\.\d{1,2})?$/), paymentMethod: z.enum(["pix", "card", "cash", "fiado"]), note: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Cadastre sua loja antes de registrar vendas");
        return db.createSale({ ...input, storeId: store.id });
      }),
    }),
    voice: router({
      interpret: publicProcedure.input(z.object({ mode: z.enum(["customer", "seller"]), command: z.string().min(1).max(500) })).mutation(({ input }) => interpretVoiceCommand(input.mode, input.command)),
      transcribe: protectedProcedure.input(z.object({ audioBase64: z.string().min(1000).max(22_000_000), mimeType: z.string().max(80).default("audio/m4a") })).mutation(async ({ ctx, input }) => {
        const upload = await storagePut(`voice/${ctx.user.id}/${Date.now()}.m4a`, Buffer.from(input.audioBase64, "base64"), input.mimeType);
        const signedUrl = await storageGetSignedUrl(upload.key);
        const result = await transcribeAudio({ audioUrl: signedUrl, language: "pt" });
        if ("error" in result) throw new Error(result.error);
        return { text: result.text, language: result.language };
      }),
    }),
    notifications: router({
      register: protectedProcedure.input(z.object({ token: z.string().min(10).max(255), platform: z.enum(["ios", "android", "web"]) })).mutation(({ ctx, input }) => db.registerPushToken({ ...input, userId: ctx.user.id })),
    }),
  }),
});

export type AppRouter = typeof appRouter;
