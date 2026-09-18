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
import { createPixCharge } from "./payments";
import { canCustomerCancelOrder, canTransitionOrder } from "./order-state";

const orderStatusSchema = z.enum(["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue", "Cancelado"]);

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
      availability: protectedProcedure.input(z.object({ productId: z.number().int().positive(), available: z.boolean() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Loja não encontrada");
        const product = await db.getProductForStore(input.productId, store.id);
        if (!product) throw new Error("Produto não pertence à sua loja");
        return db.updateProductAvailability(input.productId, input.available);
      }),
      storeOpen: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), isOpen: z.boolean() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store || store.id !== input.storeId) throw new Error("Loja não autorizada");
        return db.updateStoreOpen(input.storeId, input.isOpen);
      }),
    }),
    orders: router({
      mine: protectedProcedure.query(({ ctx }) => db.listOrdersForCustomer(ctx.user.id)),
      storeMine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listOrdersForStore(store.id) : [];
      }),
      create: protectedProcedure.input(z.object({ storeId: z.number().int().positive(), total: z.string().regex(/^\d+(\.\d{1,2})?$/), paymentMethod: z.enum(["pix", "card", "cash", "fiado"]).default("pix"), deliveryAddress: z.string().max(255).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(50), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/) })).min(1) })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store) throw new Error("Estabelecimento não encontrado");
        if (!store.isOpen) throw new Error("Estabelecimento fechado no momento");
        const products = await Promise.all(input.items.map((item) => db.getProductForStore(item.productId, input.storeId)));
        if (products.some((p) => !p)) throw new Error("Há produto inválido ou de outro estabelecimento");
        const calculated = input.items.reduce((sum, item, i) => sum + Number(products[i]!.price) * item.quantity, 0) + Number(store?.deliveryFee ?? 0);
        if (Math.abs(calculated - Number(input.total)) > 0.01) throw new Error("Total do pedido inválido");
        if (input.paymentMethod === "fiado") {
          const customer = await db.getCustomerCreditByUser(input.storeId, ctx.user.id);
          if (!customer) throw new Error("Cliente não habilitado para fiado nesta loja");
          const orderId = await db.createOrderWithFiado({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, input.items.map((item, i) => ({ ...item, unitPrice: String(products[i]!.price) })), customer.id, input.storeId);
          return { orderId, paymentId: null, status: "Pendente" as const };
        }
        const orderId = await db.createOrder({ customerId: ctx.user.id, storeId: input.storeId, total: input.total, deliveryAddress: input.deliveryAddress }, input.items.map((item, i) => ({ ...item, unitPrice: String(products[i]!.price) })));
        const paymentId = await db.createOrderPayment(orderId, input.paymentMethod);
        return { orderId, paymentId, status: "Pendente" as const };
      }),
      status: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema })).mutation(async ({ ctx, input }) => {
        const order = await db.getOrderForUser(input.orderId, ctx.user.id);
        if (!order) throw new Error("Pedido não encontrado ou não autorizado");
        const isOwner = (await db.getStoreForOwner(ctx.user.id))?.id === order.storeId;
        if (!isOwner && order.customerId !== ctx.user.id) throw new Error("Pedido não autorizado");

        if (!isOwner) {
          if (input.status !== "Cancelado" || !canCustomerCancelOrder(order.status)) {
            throw new Error("O cliente só pode cancelar pedidos ainda não preparados");
          }
          return db.updateOrderStatus(input.orderId, input.status);
        }

        if (!canTransitionOrder(order.status, input.status)) {
          throw new Error(`Transição de pedido inválida: ${order.status} → ${input.status}`);
        }
        return db.updateOrderStatus(input.orderId, input.status);
      }),
    }),
    payments: router({
      createPix: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), pixKey: z.string().min(3).max(255) })).mutation(async ({ input }) => { const charge = await createPixCharge(input); const paymentId = await db.createPendingPixPayment(input.orderId, input.pixKey); return { paymentId, ...charge }; }),
      confirm: protectedProcedure.input(z.object({ paymentId: z.number().int().positive(), gatewayStatus: z.enum(["pending", "paid", "failed"]) })).mutation(async ({ ctx, input }) => { const message = input.gatewayStatus === "paid" ? "Pagamento confirmado pelo gateway." : input.gatewayStatus === "failed" ? "O gateway informou falha no pagamento." : "Pagamento ainda aguardando confirmação do gateway."; await sendPushToUser(ctx.user.id, "Atualização do pagamento", message, { paymentId: input.paymentId, status: input.gatewayStatus }); return { paymentId: input.paymentId, status: input.gatewayStatus, message }; }),
    }),
    clients: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listCustomersForStore(store.id) : [];
      }),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(32).optional(), notes: z.string().max(500).optional(), creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00") })).mutation(async ({ ctx, input }) => {
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
      add: protectedProcedure.input(z.object({ customerId: z.number().int().positive(), type: z.enum(["credit", "payment", "adjustment", "reversal"]), amount: z.string().regex(/^\d+(\.\d{1,2})?$/), note: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Cadastre sua loja antes de lançar fiado");
        return db.createLedgerEntry({ ...input, storeId: store.id });
      }),
    }),
    credit: router({
      get: protectedProcedure.input(z.object({ customerId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Loja não encontrada");
        const customer = await db.getCustomerCredit(store.id, input.customerId);
        if (!customer) throw new Error("Cliente não encontrado");
        return { customerId: customer.id, creditLimit: customer.creditLimit, balance: customer.balance, available: Math.max(0, Number(customer.creditLimit) - Number(customer.balance)), status: customer.status };
      }),
      setLimit: protectedProcedure.input(z.object({ customerId: z.number().int().positive(), creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Loja não encontrada");
        return db.setCustomerCreditLimit(store.id, input.customerId, input.creditLimit);
      }),
      block: protectedProcedure.input(z.object({ customerId: z.number().int().positive(), blocked: z.boolean() })).mutation(async ({ ctx, input }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) throw new Error("Loja não encontrada");
        return db.blockCustomer(store.id, input.customerId, input.blocked);
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
      mine: protectedProcedure.query(({ ctx }) => db.listNotificationsForUser(ctx.user.id)),
      markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(ctx.user.id, input.notificationId)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
