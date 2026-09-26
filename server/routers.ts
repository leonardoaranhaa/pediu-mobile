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
import {
  isUniqueConstraintError,
  normalizeIdempotencyKey,
} from "./domain/idempotency";
import { adminRouter } from "./admin-router";
import { experienceRouter } from "./experience-router";
import { calculateCouponDiscount } from "./domain/coupons";
import {
  consumeRateLimit,
  rateLimitKey,
  withConcurrencyLimit,
  withTimeout,
} from "./_core/security";
import crypto from "node:crypto";
import { hashEmailToken, sendEmailVerification } from "./email-verification";

const orderStatusSchema = z.enum([
  "Pendente",
  "Aceito",
  "Preparando",
  "Pronto",
  "A caminho",
  "Entregue",
  "Cancelado",
]);
const addressInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(160),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(30),
  complement: z.string().trim().max(120).optional().nullable(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  latitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .optional()
    .nullable(),
  longitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .optional()
    .nullable(),
  isDefault: z.boolean().optional(),
});

function hasAudioSignature(audio: Buffer, mimeType: string): boolean {
  if (mimeType === "audio/wav")
    return (
      audio.subarray(0, 4).toString("ascii") === "RIFF" &&
      audio.subarray(8, 12).toString("ascii") === "WAVE"
    );
  if (mimeType === "audio/webm")
    return audio.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === "audio/m4a" || mimeType === "audio/mp4")
    return audio.subarray(4, 8).toString("ascii") === "ftyp";
  if (mimeType === "audio/mpeg")
    return (
      audio.subarray(0, 3).toString("ascii") === "ID3" ||
      (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
    );
  return false;
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    confirmEmail: publicProcedure
      .input(z.object({ token: z.string().regex(/^[a-f0-9]{32,128}$/i) }))
      .mutation(async ({ input }) => ({
        confirmed: await db.confirmEmailVerification(
          hashEmailToken(input.token),
        ),
      })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  pediu: router({
    experience: experienceRouter,
    addresses: router({
      list: protectedProcedure.query(({ ctx }) =>
        db.listCustomerAddresses(ctx.user.id),
      ),
      create: protectedProcedure
        .input(addressInputSchema)
        .mutation(({ ctx, input }) =>
          db.createCustomerAddress(ctx.user.id, input),
        ),
      update: protectedProcedure
        .input(
          z.object({
            addressId: z.number().int().positive(),
            data: addressInputSchema.partial(),
          }),
        )
        .mutation(({ ctx, input }) =>
          db.updateCustomerAddress(ctx.user.id, input.addressId, input.data),
        ),
      delete: protectedProcedure
        .input(z.object({ addressId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.deleteCustomerAddress(ctx.user.id, input.addressId),
        ),
      setDefault: protectedProcedure
        .input(z.object({ addressId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.setDefaultCustomerAddress(ctx.user.id, input.addressId),
        ),
    }),
    account: router({
      profile: router({
        mine: protectedProcedure.query(({ ctx }) =>
          db.getUserProfile(ctx.user.id),
        ),
        update: protectedProcedure
          .input(
            z.object({ name: z.string().trim().min(2).max(160).optional() }),
          )
          .mutation(({ ctx, input }) =>
            db.updateUserProfile(ctx.user.id, input),
          ),
        requestEmailChange: protectedProcedure
          .input(z.object({ email: z.string().trim().email().max(320) }))
          .mutation(async ({ ctx, input }) => {
            const profile = await db.getUserProfile(ctx.user.id);
            if (!profile) throw new Error("Perfil não encontrado");
            if (profile.email?.toLowerCase() === input.email.toLowerCase())
              return { verificationSent: false, unchanged: true as const };
            const token = crypto.randomBytes(32).toString("hex");
            await db.createEmailVerificationToken({
              userId: ctx.user.id,
              email: input.email.toLowerCase(),
              tokenHash: hashEmailToken(token),
              expiresAt: new Date(Date.now() + 30 * 60_000),
            });
            let verificationSent = false;
            try {
              verificationSent = await sendEmailVerification({
                email: input.email.toLowerCase(),
                token,
              });
            } catch {
              verificationSent = false;
            }
            return { verificationSent, unchanged: false as const };
          }),
        theme: router({
          update: protectedProcedure
            .input(
              z.object({ themeId: z.enum(["classic", "ocean", "sunset"]) }),
            )
            .mutation(({ ctx, input }) =>
              db.updateUserTheme(ctx.user.id, input.themeId),
            ),
        }),
      }),
      paymentPreferences: router({
        mine: protectedProcedure.query(({ ctx }) =>
          db.getCustomerPaymentPreferences(ctx.user.id),
        ),
        update: protectedProcedure
          .input(
            z.object({
              pixEnabled: z.boolean().optional(),
              cardEnabled: z.boolean().optional(),
              cashEnabled: z.boolean().optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            db.updateCustomerPaymentPreferences(
              ctx.user.id,
              Object.fromEntries(
                Object.entries(input).map(([key, value]) => [
                  key,
                  value ? 1 : 0,
                ]),
              ),
            ),
          ),
      }),
    }),
    marketplace: router({
      products: publicProcedure
        .input(z.object({ category: z.string().optional() }).optional())
        .query(({ input }) => db.listAvailableProducts(input?.category)),
      search: publicProcedure
        .input(
          z.object({
            query: z.string().trim().max(120).optional(),
            category: z.string().optional(),
            minPrice: z.number().nonnegative().optional(),
            maxPrice: z.number().nonnegative().optional(),
            limit: z.number().int().min(1).max(50).default(20),
            offset: z.number().int().min(0).default(0),
          }),
        )
        .query(({ input }) => db.searchAvailableProducts(input)),
    }),
    checkout: router({
      quote: protectedProcedure
        .input(
          z.object({
            storeId: z.number().int().positive(),
            items: z
              .array(
                z.object({
                  productId: z.number().int().positive(),
                  quantity: z.number().int().positive().max(50),
                  note: z.string().trim().max(500).optional(),
                }),
              )
              .min(1),
            couponCode: z.string().trim().min(1).max(40).optional(),
          }),
        )
        .query(async ({ input }) => {
          const store = await db.getStoreById(input.storeId);
          if (!store) throw new Error("Estabelecimento não encontrado");
          if (!store.isOpen)
            throw new Error("Estabelecimento fechado no momento");
          const quotedItems = await Promise.all(
            input.items.map(async (item) => {
              const product = await db.getAvailableProductForStore(
                item.productId,
                input.storeId,
              );
              if (!product)
                throw new Error(
                  "Há produto inválido ou indisponível no carrinho",
                );
              const unitPrice = Number(product.price);
              return {
                productId: product.id,
                name: product.name,
                quantity: item.quantity,
                unitPrice: unitPrice.toFixed(2),
                lineTotal: (unitPrice * item.quantity).toFixed(2),
                note: item.note,
              };
            }),
          );
          const subtotal = quotedItems.reduce(
            (sum, item) => sum + Number(item.lineTotal),
            0,
          );
          const deliveryFee = Number(store.deliveryFee ?? 0);
          let couponCode: string | undefined;
          let discount = "0.00";
          if (input.couponCode) {
            const calculation = calculateCouponDiscount(
              await db.getCouponByCode(input.couponCode),
              subtotal,
            );
            if (!calculation.valid)
              throw new Error(calculation.reason ?? "Cupom inválido");
            couponCode = calculation.code;
            discount = calculation.discount;
          }
          return {
            storeId: store.id,
            items: quotedItems,
            subtotal: subtotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            couponCode,
            discount,
            total: (subtotal + deliveryFee - Number(discount)).toFixed(2),
          };
        }),
    }),
    stores: router({
      mine: protectedProcedure.query(({ ctx }) =>
        db.getStoreForOwner(ctx.user.id),
      ),
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().trim().min(2).max(160),
            phone: z.string().trim().max(32).optional(),
            address: z.string().trim().max(255).optional(),
            pixKey: z.string().trim().max(255).optional(),
            deliveryFee: z
              .string()
              .regex(/^\d+(\.\d{1,2})?$/)
              .default("0.00"),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (await db.getStoreForOwner(ctx.user.id))
            throw new Error("Este usuário já possui uma loja");
          return db.createStore({ ...input, ownerId: ctx.user.id });
        }),
      update: protectedProcedure
        .input(
          z
            .object({
              name: z.string().trim().min(2).max(160).optional(),
              phone: z.string().trim().max(32).optional(),
              address: z.string().trim().max(255).optional(),
              pixKey: z.string().trim().max(255).optional(),
              deliveryFee: z
                .string()
                .regex(/^\d+(\.\d{1,2})?$/)
                .optional(),
              isOpen: z.boolean().optional(),
            })
            .refine(
              (input) =>
                Object.values(input).some((value) => value !== undefined),
              "Informe ao menos uma alteração",
            ),
        )
        .mutation(({ ctx, input }) => {
          const { isOpen, ...changes } = input;
          return db.updateStoreForOwner(ctx.user.id, {
            ...changes,
            ...(isOpen === undefined ? {} : { isOpen: isOpen ? 1 : 0 }),
          });
        }),
      couriers: protectedProcedure.query(({ ctx }) =>
        db.listCouriersForStore(ctx.user.id),
      ),
      linkCourier: protectedProcedure
        .input(z.object({ courierUserId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.linkCourierToStore(ctx.user.id, input.courierUserId),
        ),
    }),
    courier: router({
      profile: router({
        mine: protectedProcedure.query(({ ctx }) =>
          db.getCourierProfileByUser(ctx.user.id),
        ),
        register: protectedProcedure
          .input(
            z.object({
              vehicleType: z.enum(["bike", "moto", "car"]),
              vehiclePlate: z.string().trim().max(16).optional(),
              phone: z.string().trim().max(32).optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            db.upsertCourierProfile({ ...input, userId: ctx.user.id }),
          ),
        locationConsent: protectedProcedure
          .input(z.object({ accepted: z.boolean() }))
          .mutation(({ ctx, input }) =>
            db.setCourierLocationConsent(ctx.user.id, input.accepted),
          ),
        availability: protectedProcedure
          .input(z.object({ value: z.enum(["offline", "available", "busy"]) }))
          .mutation(({ ctx, input }) =>
            db.setCourierAvailability(ctx.user.id, input.value),
          ),
      }),
      offers: protectedProcedure.query(({ ctx }) =>
        db.listPendingDeliveryOffers(ctx.user.id),
      ),
      acceptOffer: protectedProcedure
        .input(z.object({ offerId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.respondToDeliveryOffer({
            offerId: input.offerId,
            courierUserId: ctx.user.id,
            accept: true,
          }),
        ),
      rejectOffer: protectedProcedure
        .input(z.object({ offerId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.respondToDeliveryOffer({
            offerId: input.offerId,
            courierUserId: ctx.user.id,
            accept: false,
          }),
        ),
      active: protectedProcedure.query(({ ctx }) =>
        db.listActiveDeliveriesForCourier(ctx.user.id),
      ),
    }),
    products: router({
      mine: protectedProcedure
        .input(z.object({ storeId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          return store?.id === input.storeId
            ? db.listProductsForStore(input.storeId)
            : [];
        }),
      create: protectedProcedure
        .input(
          z.object({
            storeId: z.number().int().positive(),
            name: z.string().min(2).max(180),
            category: z.string().min(2).max(80),
            description: z.string().max(1000).optional(),
            price: z.string().regex(/^\d+(\.\d{1,2})?$/),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (store?.id !== input.storeId)
            throw new Error("Loja não autorizada");
          return db.createProduct({ ...input, available: 1 });
        }),
      availability: protectedProcedure
        .input(
          z.object({
            productId: z.number().int().positive(),
            available: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store) throw new Error("Loja não encontrada");
          const product = await db.getProductForStore(
            input.productId,
            store.id,
          );
          if (!product) throw new Error("Produto não pertence à sua loja");
          return db.updateProductAvailability(input.productId, input.available);
        }),
      storeOpen: protectedProcedure
        .input(
          z.object({
            storeId: z.number().int().positive(),
            isOpen: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store || store.id !== input.storeId)
            throw new Error("Loja não autorizada");
          return db.updateStoreOpen(input.storeId, input.isOpen);
        }),
    }),
    orders: router({
      mine: protectedProcedure
        .input(
          z
            .object({
              limit: z.number().int().min(1).max(100).default(50),
              offset: z.number().int().min(0).default(0),
            })
            .optional(),
        )
        .query(({ ctx, input }) =>
          db.listOrdersForCustomer(
            ctx.user.id,
            input?.limit ?? 50,
            input?.offset ?? 0,
          ),
        ),
      get: protectedProcedure
        .input(z.object({ orderId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          const order = await db.getOrderForUser(input.orderId, ctx.user.id);
          if (!order)
            throw new Error("Pedido não encontrado ou não autorizado");
          return order;
        }),
      storeMine: protectedProcedure
        .input(
          z
            .object({
              limit: z.number().int().min(1).max(100),
              offset: z.number().int().min(0).default(0),
            })
            .optional(),
        )
        .query(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          return store
            ? db.listOrdersForStore(
                store.id,
                input?.limit ?? 50,
                input?.offset ?? 0,
              )
            : [];
        }),
      create: protectedProcedure
        .input(
          z.object({
            idempotencyKey: z.string().trim().min(8).max(160),
            storeId: z.number().int().positive(),
            total: z.string().regex(/^\d+(\.\d{1,2})?$/),
            paymentMethod: z.enum(["pix", "cash", "fiado"]).default("pix"),
            addressId: z.number().int().positive().optional(),
            deliveryAddress: z.string().trim().max(255).optional(),
            couponCode: z.string().trim().min(1).max(40).optional(),
            items: z
              .array(
                z.object({
                  productId: z.number().int().positive(),
                  quantity: z.number().int().positive().max(50),
                  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
                  note: z.string().trim().max(500).optional(),
                }),
              )
              .min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
          const existing = await db.getOrderByIdempotencyKey(
            ctx.user.id,
            idempotencyKey,
          );
          if (existing) {
            const payment = await db.getPaymentForOrder(
              existing.id,
              ctx.user.id,
            );
            return {
              orderId: existing.id,
              paymentId: payment?.id ?? null,
              status: existing.status,
            };
          }
          let deliveryAddress = input.deliveryAddress?.trim() || "";
          if (input.addressId) {
            const savedAddress = await db.getCustomerAddress(
              ctx.user.id,
              input.addressId,
            );
            if (!savedAddress)
              throw new Error("Endereço não encontrado ou não autorizado");
            deliveryAddress = [
              `${savedAddress.street}, ${savedAddress.number}`,
              savedAddress.complement,
              `${savedAddress.neighborhood} · ${savedAddress.city}/${savedAddress.state}`,
              savedAddress.postalCode,
            ]
              .filter(Boolean)
              .join(", ");
          }
          if (!deliveryAddress)
            throw new Error("Informe o endereço de entrega");
          const store = await db.getStoreById(input.storeId);
          if (!store) throw new Error("Estabelecimento não encontrado");
          if (!store.isOpen)
            throw new Error("Estabelecimento fechado no momento");
          const products = await Promise.all(
            input.items.map((item) =>
              db.getAvailableProductForStore(item.productId, input.storeId),
            ),
          );
          if (products.some((p) => !p))
            throw new Error("Há produto inválido ou de outro estabelecimento");
          const subtotal = input.items.reduce(
            (sum, item, i) => sum + Number(products[i]!.price) * item.quantity,
            0,
          );
          let couponCode: string | undefined;
          let discount = "0.00";
          if (input.couponCode) {
            const calculation = calculateCouponDiscount(
              await db.getCouponByCode(input.couponCode),
              subtotal,
            );
            if (!calculation.valid)
              throw new Error(calculation.reason ?? "Cupom inválido");
            couponCode = calculation.code;
            discount = calculation.discount;
          }
          const calculated =
            subtotal + Number(store.deliveryFee ?? 0) - Number(discount);
          if (Math.abs(calculated - Number(input.total)) > 0.01)
            throw new Error("Total do pedido inválido");
          const serverTotal = calculated.toFixed(2);
          const recoverConcurrentOrder = async () => {
            const racedOrder = await db.getOrderByIdempotencyKey(
              ctx.user.id,
              idempotencyKey,
            );
            if (!racedOrder) return undefined;
            const racedPayment = await db.getPaymentForOrder(
              racedOrder.id,
              ctx.user.id,
            );
            return {
              orderId: racedOrder.id,
              paymentId: racedPayment?.id ?? null,
              status: racedOrder.status,
            };
          };
          if (input.paymentMethod === "fiado") {
            const customer = await db.getCustomerCreditByUser(
              input.storeId,
              ctx.user.id,
            );
            if (!customer)
              throw new Error("Cliente não habilitado para fiado nesta loja");
            let orderId: number;
            try {
              orderId = await db.createOrderWithFiado(
                {
                  customerId: ctx.user.id,
                  storeId: input.storeId,
                  total: serverTotal,
                  couponCode,
                  discount,
                  deliveryAddress,
                  idempotencyKey,
                },
                input.items.map((item, i) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: String(products[i]!.price),
                  ...(item.note ? { note: item.note } : {}),
                })),
                customer.id,
                input.storeId,
              );
            } catch (error) {
              if (!isUniqueConstraintError(error)) throw error;
              const raced = await recoverConcurrentOrder();
              if (raced) return raced;
              throw error;
            }
            try {
              await db.createDeliveryEvent({ orderId, eventType: "Pendente" });
            } catch (error) {
              console.warn(
                "[Orders] Failed to persist initial delivery event:",
                error,
              );
            }
            try {
              await sendPushToUser(
                store.ownerId,
                "Novo pedido",
                `O pedido #${orderId} foi recebido e está pendente de aceite.`,
                { type: "order", orderId, status: "Pendente" },
              );
            } catch (error) {
              console.warn(
                "[Orders] Failed to notify store owner about new fiado order:",
                error,
              );
            }
            return { orderId, paymentId: null, status: "Pendente" as const };
          }
          let orderAndPayment: { orderId: number; paymentId: number };
          try {
            orderAndPayment = await db.createOrderWithPayment(
              {
                customerId: ctx.user.id,
                storeId: input.storeId,
                total: serverTotal,
                couponCode,
                discount,
                deliveryAddress,
                idempotencyKey,
              },
              input.items.map((item, i) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: String(products[i]!.price),
                ...(item.note ? { note: item.note } : {}),
              })),
              input.paymentMethod,
            );
          } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
            const raced = await recoverConcurrentOrder();
            if (raced) return raced;
            throw error;
          }
          const { orderId, paymentId } = orderAndPayment;
          try {
            await db.createDeliveryEvent({ orderId, eventType: "Pendente" });
          } catch (error) {
            console.warn(
              "[Orders] Failed to persist initial delivery event:",
              error,
            );
          }
          try {
            await sendPushToUser(
              store.ownerId,
              "Novo pedido",
              `O pedido #${orderId} foi recebido e está pendente de aceite.`,
              { type: "order", orderId, status: "Pendente" },
            );
          } catch (error) {
            console.warn(
              "[Orders] Failed to notify store owner about new order:",
              error,
            );
          }
          return { orderId, paymentId, status: "Pendente" as const };
        }),
      status: protectedProcedure
        .input(
          z.object({
            orderId: z.number().int().positive(),
            status: orderStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const order = await db.getOrderForUser(input.orderId, ctx.user.id);
          if (!order)
            throw new Error("Pedido não encontrado ou não autorizado");
          const isOwner =
            (await db.getStoreForOwner(ctx.user.id))?.id === order.storeId;
          if (!isOwner && order.customerId !== ctx.user.id)
            throw new Error("Pedido não autorizado");
          if (!isOwner) {
            if (
              input.status !== "Cancelado" ||
              !canCustomerCancelOrder(order.status)
            )
              throw new Error(
                "O cliente só pode cancelar pedidos ainda não preparados",
              );
            const updated = await db.updateOrderStatus(
              input.orderId,
              input.status,
              order.status,
            );
            if (!updated.changed && updated.status !== input.status)
              throw new Error("O pedido mudou durante o cancelamento");
            if (updated.changed) {
              try {
                await db.createDeliveryEvent({
                  orderId: input.orderId,
                  eventType: input.status,
                });
              } catch (error) {
                console.warn(
                  "[Orders] Failed to persist cancellation event:",
                  error,
                );
              }
            }
            await db.cancelPendingPaymentForOrder(input.orderId);
            const store = await db.getStoreById(order.storeId);
            if (store) {
              try {
                await sendPushToUser(
                  store.ownerId,
                  "Pedido cancelado",
                  `O pedido #${order.id} foi cancelado pelo cliente.`,
                  { type: "order", orderId: order.id, status: input.status },
                );
              } catch (error) {
                console.warn(
                  "[Orders] Failed to notify store owner about cancellation:",
                  error,
                );
              }
            }
            return { success: true as const };
          }
          if (!canTransitionOrder(order.status, input.status))
            throw new Error(
              `Transição de pedido inválida: ${order.status} → ${input.status}`,
            );
          const updated = await db.updateOrderStatus(
            input.orderId,
            input.status,
            order.status,
          );
          if (!updated.changed) {
            if (updated.status !== input.status)
              throw new Error("O pedido mudou durante a atualização");
            return { success: true as const };
          }
          try {
            await db.createDeliveryEvent({
              orderId: input.orderId,
              eventType: input.status,
            });
          } catch (error) {
            console.warn("[Orders] Failed to persist delivery event:", error);
          }
          try {
            await sendPushToUser(
              order.customerId,
              "Atualização do pedido",
              `Seu pedido #${order.id} agora está: ${input.status}.`,
              { type: "order", orderId: order.id, status: input.status },
            );
          } catch (error) {
            console.warn(
              "[Orders] Failed to notify customer about status change:",
              error,
            );
          }
          return { success: true as const };
        }),
    }),
    payments: router({
      get: protectedProcedure
        .input(z.object({ paymentId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          const payment = await db.getPaymentForUser(
            input.paymentId,
            ctx.user.id,
          );
          if (!payment)
            throw new Error("Pagamento não encontrado ou não autorizado");
          return payment;
        }),
      createPix: protectedProcedure
        .input(z.object({ orderId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          const order = await db.getOrderForCustomer(
            input.orderId,
            ctx.user.id,
          );
          if (!order)
            throw new Error("Pedido não encontrado ou não autorizado");
          if (order.status === "Cancelado")
            throw new Error("Não é possível pagar um pedido cancelado");
          const store = await db.getStoreById(order.storeId);
          if (!store?.pixKey)
            throw new Error("A loja ainda não configurou uma chave PIX");
          const existingPayment = await db.getPendingPixPaymentForOrder(
            order.id,
          );
          if (existingPayment)
            return {
              paymentId: existingPayment.id,
              amount: order.total,
              providerChargeId: existingPayment.transactionId,
              status: existingPayment.status,
              checkoutUrl: null,
              provider: "persisted",
              message: "Cobrança PIX já existente.",
            };
          const charge = await createPixCharge({
            orderId: order.id,
            amount: order.total,
            pixKey: store.pixKey,
            idempotencyKey: `pix-order-${order.id}`,
          });
          let paymentId: number;
          try {
            paymentId = await db.createPendingPixPayment(
              order.id,
              store.pixKey,
              charge.providerChargeId,
            );
          } catch (error) {
            if (!charge.providerChargeId) throw error;
            const existingByTransaction = await db.getPaymentByTransactionId(
              charge.providerChargeId,
            );
            if (!existingByTransaction) throw error;
            paymentId = existingByTransaction.id;
          }
          try {
            await sendPushToUser(
              ctx.user.id,
              "PIX gerado",
              `A cobrança PIX do pedido #${order.id} está pronta para pagamento.`,
              {
                type: "payment",
                orderId: order.id,
                paymentId,
                status: "pending",
              },
            );
          } catch (error) {
            console.warn(
              "[Payments] Failed to notify customer about PIX creation:",
              error,
            );
          }
          return { paymentId, amount: order.total, ...charge };
        }),
    }),
    clients: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listCustomersForStore(store.id) : [];
      }),
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(2).max(160),
            phone: z.string().max(32).optional(),
            notes: z.string().max(500).optional(),
            creditLimit: z
              .string()
              .regex(/^\d+(\.\d{1,2})?$/)
              .default("0.00"),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store)
            throw new Error("Cadastre sua loja antes de criar clientes");
          return db.createCustomer({ ...input, storeId: store.id });
        }),
    }),
    ledger: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        return store ? db.listLedgerEntriesForStore(store.id) : [];
      }),
      add: protectedProcedure
        .input(
          z.object({
            customerId: z.number().int().positive(),
            type: z.enum(["credit", "payment", "adjustment", "reversal"]),
            amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
            note: z.string().max(255).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store)
            throw new Error("Cadastre sua loja antes de lançar fiado");
          return db.createLedgerEntry({ ...input, storeId: store.id });
        }),
    }),
    credit: router({
      get: protectedProcedure
        .input(z.object({ customerId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store) throw new Error("Loja não encontrada");
          const customer = await db.getCustomerCredit(
            store.id,
            input.customerId,
          );
          if (!customer) throw new Error("Cliente não encontrado");
          return {
            customerId: customer.id,
            creditLimit: customer.creditLimit,
            balance: customer.balance,
            available: Math.max(
              0,
              Number(customer.creditLimit) - Number(customer.balance),
            ),
            status: customer.status,
          };
        }),
      setLimit: protectedProcedure
        .input(
          z.object({
            customerId: z.number().int().positive(),
            creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store) throw new Error("Loja não encontrada");
          return db.setCustomerCreditLimit(
            store.id,
            input.customerId,
            input.creditLimit,
          );
        }),
      block: protectedProcedure
        .input(
          z.object({
            customerId: z.number().int().positive(),
            blocked: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
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
      create: protectedProcedure
        .input(
          z.object({
            customerId: z.number().int().positive().optional(),
            total: z.string().regex(/^\d+(\.\d{1,2})?$/),
            paymentMethod: z.enum(["pix", "card", "cash", "fiado"]),
            note: z.string().max(255).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store)
            throw new Error("Cadastre sua loja antes de registrar vendas");
          return db.createSale({ ...input, storeId: store.id });
        }),
    }),
    voice: router({
      interpret: publicProcedure
        .input(
          z.object({
            mode: z.enum(["customer", "seller"]),
            command: z.string().trim().min(1).max(500),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (
            !consumeRateLimit(
              rateLimitKey(ctx.req, "voice:interpret"),
              20,
              5 * 60_000,
            )
          )
            throw new Error(
              "Limite de comandos de voz atingido. Tente novamente em alguns minutos.",
            );
          return withConcurrencyLimit("voice:interpret", 4, () =>
            withTimeout(
              interpretVoiceCommand(input.mode, input.command),
              15_000,
              "O assistente demorou para responder. Tente novamente.",
            ),
          );
        }),
      transcribe: protectedProcedure
        .input(
          z.object({
            audioBase64: z.string().min(1000).max(12_000_000),
            mimeType: z
              .enum([
                "audio/m4a",
                "audio/mp4",
                "audio/wav",
                "audio/mpeg",
                "audio/webm",
              ])
              .default("audio/m4a"),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (
            !consumeRateLimit(
              rateLimitKey(ctx.req, "voice:transcribe", ctx.user.id),
              10,
              10 * 60_000,
            )
          )
            throw new Error(
              "Limite de transcrição atingido. Tente novamente mais tarde.",
            );
          const encoded = input.audioBase64.replace(/\s/g, "");
          if (
            !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
            encoded.length % 4 !== 0
          )
            throw new Error("Áudio codificado inválido");
          const audio = Buffer.from(encoded, "base64");
          if (audio.length < 1024 || audio.length > 8 * 1024 * 1024)
            throw new Error("O áudio deve ter entre 1 KB e 8 MB");
          if (!hasAudioSignature(audio, input.mimeType))
            throw new Error(
              "O conteúdo do áudio não corresponde ao formato informado",
            );
          const extension =
            input.mimeType.split("/")[1] === "mpeg"
              ? "mp3"
              : input.mimeType.split("/")[1];
          const upload = await storagePut(
            `voice/${ctx.user.id}/${Date.now()}.${extension}`,
            audio,
            input.mimeType,
          );
          const signedUrl = await storageGetSignedUrl(upload.key);
          const result = await withConcurrencyLimit("voice:transcribe", 2, () =>
            withTimeout(
              transcribeAudio({ audioUrl: signedUrl, language: "pt" }),
              45_000,
              "A transcrição demorou para responder. Tente novamente.",
            ),
          );
          if ("error" in result) throw new Error(result.error);
          return { text: result.text, language: result.language };
        }),
    }),
    notifications: router({
      register: protectedProcedure
        .input(
          z.object({
            token: z.string().min(10).max(255),
            platform: z.enum(["ios", "android", "web"]),
          }),
        )
        .mutation(({ ctx, input }) =>
          db.registerPushToken({ ...input, userId: ctx.user.id }),
        ),
      mine: protectedProcedure
        .input(
          z
            .object({
              limit: z.number().int().min(1).max(100).default(50),
              offset: z.number().int().min(0).default(0),
            })
            .optional(),
        )
        .query(({ ctx, input }) =>
          db.listNotificationsForUser(
            ctx.user.id,
            input?.limit ?? 50,
            input?.offset ?? 0,
          ),
        ),
      markRead: protectedProcedure
        .input(z.object({ notificationId: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          db.markNotificationRead(ctx.user.id, input.notificationId),
        ),
      preferences: router({
        mine: protectedProcedure.query(({ ctx }) =>
          db.getNotificationPreferences(ctx.user.id),
        ),
        update: protectedProcedure
          .input(
            z.object({
              orderUpdates: z.boolean().optional(),
              supportMessages: z.boolean().optional(),
              promotions: z.boolean().optional(),
              pushEnabled: z.boolean().optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            db.updateNotificationPreferences(
              ctx.user.id,
              Object.fromEntries(
                Object.entries(input).map(([key, value]) => [
                  key,
                  value ? 1 : 0,
                ]),
              ),
            ),
          ),
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
