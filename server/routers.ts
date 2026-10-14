import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
import { enforceDistributedRateLimit } from "./_core/distributed-rate-limit";
import { calculateCouponDiscount } from "./domain/coupons";
import { clampTipAmount, resolveFlashFulfillment } from "./domain/flash";
import { DEFAULT_TIP_DESTINATION } from "./domain/tips";
import { normalizeSaleUnit, SALE_UNITS } from "./domain/market-units";
import { getTasteMood, TASTE_MOODS } from "./domain/taste";
import {
  calculateServiceability,
  serviceabilityMessage,
} from "./domain/serviceability";
import { withConcurrencyLimit, withTimeout } from "./_core/security";
import crypto from "node:crypto";
import { hashEmailToken, sendEmailVerification } from "./email-verification";
import { generateAdCreative } from "./ad-generation";

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
        .query(async ({ input }) => {
          const products = await db.listAvailableProducts(input?.category);
          return Promise.all(
            products.map(async (item) => ({
              ...item,
              adImageUrl: item.adImageKey
                ? await storageGetSignedUrl(item.adImageKey).catch(() => null)
                : null,
            })),
          );
        }),
      search: publicProcedure
        .input(
          z.object({
            query: z.string().trim().max(120).optional(),
            category: z.string().optional(),
            minPrice: z.number().nonnegative().optional(),
            maxPrice: z.number().nonnegative().optional(),
            flash: z.boolean().optional(),
            vertical: z.enum(["restaurant", "market", "service"]).optional(),
            limit: z.number().int().min(1).max(50).default(20),
            cursor: z.string().trim().min(1).max(2_000).optional(),
            offset: z.number().int().min(0).default(0),
          }),
        )
        .query(async ({ input }) => {
          let result: Awaited<ReturnType<typeof db.searchAvailableProducts>>;
          try {
            result = await db.searchAvailableProducts(input);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.toLowerCase().includes("cursor")
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: error.message,
              });
            }
            throw error;
          }
          const items = await Promise.all(
            result.items.map(async (item) => ({
              ...item,
              adImageUrl: item.adImageKey
                ? await storageGetSignedUrl(item.adImageKey).catch(() => null)
                : null,
            })),
          );
          return { ...result, items };
        }),
      taste: publicProcedure
        .input(
          z.object({
            moodId: z.string().trim().min(1).max(40),
            limit: z.number().int().min(1).max(50).default(20),
            offset: z.number().int().min(0).default(0),
          }),
        )
        .query(async ({ input }) => {
          const mood = getTasteMood(input.moodId);
          if (!mood)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Humor de Sabor não encontrado",
            });
          const result = await db.searchAvailableProducts({
            query: mood.query,
            limit: input.limit,
            offset: input.offset,
          });
          const items = await Promise.all(
            result.items.map(async (item) => ({
              ...item,
              adImageUrl: item.adImageKey
                ? await storageGetSignedUrl(item.adImageKey).catch(() => null)
                : null,
            })),
          );
          return { mood, moods: TASTE_MOODS, ...result, items };
        }),
      moods: publicProcedure.query(() => TASTE_MOODS),
    }),
    loyalty: router({
      me: protectedProcedure.query(({ ctx }) =>
        db.getLoyaltySummary(ctx.user.id),
      ),
      history: protectedProcedure
        .input(
          z
            .object({
              limit: z.number().int().min(1).max(100).default(50),
              offset: z.number().int().min(0).default(0),
            })
            .optional(),
        )
        .query(({ ctx, input }) =>
          db.listLoyaltyHistory(
            ctx.user.id,
            input?.limit ?? 50,
            input?.offset ?? 0,
          ),
        ),
      redeem: protectedProcedure
        .input(
          z.object({
            blocks: z.number().int().min(1).max(20).default(1),
            idempotencyKey: z.string().trim().min(8).max(160),
          }),
        )
        .mutation(({ ctx, input }) =>
          db.redeemLoyaltyPoints(
            ctx.user.id,
            input.blocks,
            input.idempotencyKey,
          ),
        ),
    }),
    checkout: router({
      quote: protectedProcedure
        .input(
          z.object({
            storeId: z.number().int().positive(),
            addressId: z.number().int().positive().optional(),
            fulfillmentMode: z.enum(["delivery", "pickup"]).default("delivery"),
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
            fulfillment: z.enum(["standard", "flash"]).default("standard"),
            tipAmount: z.number().nonnegative().max(500).optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const store = await db.getStoreById(input.storeId);
          if (!store) throw new Error("Estabelecimento não encontrado");
          if (!store.isOpen)
            throw new Error("Estabelecimento fechado no momento");
          if (store.kind === "market" && input.fulfillmentMode === "pickup")
            throw new Error(
              "Compras de mercado são entregues pelo Pediu Entregas; selecione um endereço.",
            );
          const flash = resolveFlashFulfillment(store, input.fulfillment);
          if (
            input.fulfillment === "flash" &&
            (input.fulfillmentMode !== "delivery" || !flash.isFlash)
          )
            throw new Error(flash.reason ?? "Flash indisponível");
          const pricingStore = flash.isFlash
            ? { ...store, deliveryFee: flash.deliveryFee }
            : store;
          const address = input.addressId
            ? await db.getCustomerAddress(ctx.user.id, input.addressId)
            : undefined;
          if (input.addressId && !address)
            throw new Error("Endereço não encontrado ou não autorizado");
          const serviceability = calculateServiceability(
            input.fulfillmentMode,
            pricingStore,
            address,
          );
          if (!serviceability.serviceable)
            throw new Error(serviceabilityMessage(serviceability));
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
          const tipAmount = clampTipAmount(input.tipAmount, subtotal);
          const deliveryFee = Number(serviceability.deliveryFee);
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
            fulfillmentMode: serviceability.mode,
            fulfillment: input.fulfillment,
            isFlash: flash.isFlash,
            flashEligible: resolveFlashFulfillment(store, "flash").isFlash,
            flashEtaMaxMinutes: flash.etaMaxMinutes,
            storeKind: store.kind,
            tipAmount,
            tipDestination: DEFAULT_TIP_DESTINATION,
            distanceKm: serviceability.distanceKm,
            serviceabilityReason: serviceability.reason,
            couponCode,
            discount,
            total: (
              subtotal +
              deliveryFee -
              Number(discount) +
              Number(tipAmount)
            ).toFixed(2),
          };
        }),
    }),
    coupons: router({
      available: publicProcedure.query(() => db.listActiveCoupons()),
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
            deliveryEnabled: z.boolean().default(true),
            pickupEnabled: z.boolean().default(false),
            deliveryRadiusKm: z
              .string()
              .regex(/^\d+(\.\d{1,2})?$/)
              .refine((value) => Number(value) > 0, "Raio de entrega inválido")
              .default("10.00"),
            latitude: z.number().min(-90).max(90).optional().nullable(),
            longitude: z.number().min(-180).max(180).optional().nullable(),
            kind: z
              .enum(["restaurant", "market", "service"])
              .default("restaurant"),
            flashEnabled: z.boolean().default(false),
            flashEtaMaxMinutes: z.number().int().min(5).max(120).default(30),
            flashFeeOverride: z
              .string()
              .regex(/^\d+(\.\d{1,2})?$/)
              .optional()
              .nullable(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (await db.getStoreForOwner(ctx.user.id))
            throw new Error("Este usuário já possui uma loja");
          const {
            deliveryEnabled,
            pickupEnabled,
            flashEnabled,
            ...storeInput
          } = input;
          return db.createStore({
            ...storeInput,
            deliveryEnabled: deliveryEnabled ? 1 : 0,
            pickupEnabled: pickupEnabled ? 1 : 0,
            flashEnabled: flashEnabled ? 1 : 0,
            latitude:
              storeInput.latitude === null || storeInput.latitude === undefined
                ? storeInput.latitude
                : storeInput.latitude.toFixed(7),
            longitude:
              storeInput.longitude === null ||
              storeInput.longitude === undefined
                ? storeInput.longitude
                : storeInput.longitude.toFixed(7),
            ownerId: ctx.user.id,
          });
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
              deliveryEnabled: z.boolean().optional(),
              pickupEnabled: z.boolean().optional(),
              deliveryRadiusKm: z
                .string()
                .regex(/^\d+(\.\d{1,2})?$/)
                .refine(
                  (value) => Number(value) > 0,
                  "Raio de entrega inválido",
                )
                .optional(),
              latitude: z.number().min(-90).max(90).optional().nullable(),
              longitude: z.number().min(-180).max(180).optional().nullable(),
              kind: z.enum(["restaurant", "market", "service"]).optional(),
              flashEnabled: z.boolean().optional(),
              flashEtaMaxMinutes: z.number().int().min(5).max(120).optional(),
              flashFeeOverride: z
                .string()
                .regex(/^\d+(\.\d{1,2})?$/)
                .optional()
                .nullable(),
              isOpen: z.boolean().optional(),
            })
            .refine(
              (input) =>
                Object.values(input).some((value) => value !== undefined),
              "Informe ao menos uma alteração",
            ),
        )
        .mutation(({ ctx, input }) => {
          const {
            isOpen,
            deliveryEnabled,
            pickupEnabled,
            flashEnabled,
            ...changes
          } = input;
          return db.updateStoreForOwner(ctx.user.id, {
            ...changes,
            latitude:
              changes.latitude === null || changes.latitude === undefined
                ? changes.latitude
                : changes.latitude.toFixed(7),
            longitude:
              changes.longitude === null || changes.longitude === undefined
                ? changes.longitude
                : changes.longitude.toFixed(7),
            ...(deliveryEnabled === undefined
              ? {}
              : { deliveryEnabled: deliveryEnabled ? 1 : 0 }),
            ...(pickupEnabled === undefined
              ? {}
              : { pickupEnabled: pickupEnabled ? 1 : 0 }),
            ...(flashEnabled === undefined
              ? {}
              : { flashEnabled: flashEnabled ? 1 : 0 }),
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
    ads: router({
      credits: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store)
          throw new Error("Cadastre sua loja antes de criar anúncios");
        return db.getAdCreditsForStore(store.id);
      }),
      mine: protectedProcedure.query(async ({ ctx }) => {
        const store = await db.getStoreForOwner(ctx.user.id);
        if (!store) return [];
        const ads = await db.listGeneratedAdsForStore(store.id);
        return Promise.all(
          ads.map(async (ad) => ({
            ...ad,
            imageUrl: ad.imageKey
              ? await storageGetSignedUrl(ad.imageKey).catch(() => null)
              : null,
          })),
        );
      }),
      generate: protectedProcedure
        .input(
          z.object({
            productId: z.number().int().positive(),
            offerLabel: z.string().trim().max(120).optional(),
            audience: z.string().trim().max(120).optional(),
            tone: z
              .enum(["irresistivel", "caseiro", "premium", "divertido"])
              .default("irresistivel"),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await enforceDistributedRateLimit(ctx, {
            scope: "ads:generate",
            identity: ctx.user.id,
            limit: 5,
            windowMs: 10 * 60_000,
            message: "Limite de criações atingido. Tente novamente mais tarde.",
          });
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store)
            throw new Error("Cadastre sua loja antes de criar anúncios");
          const product = await db.getProductForStore(
            input.productId,
            store.id,
          );
          if (!product) throw new Error("Produto não pertence à sua loja");
          const creative = await withConcurrencyLimit("ads:generate", 2, () =>
            withTimeout(
              generateAdCreative({
                storeName: store.name,
                productName: product.name,
                category: product.category,
                productDescription: product.description,
                price: product.price,
                offerLabel: input.offerLabel,
                audience: input.audience,
                tone: input.tone,
              }),
              90_000,
              "A criação do anúncio demorou para responder. Tente novamente.",
            ),
          );
          const ad = await db.createGeneratedAdWithCredit({
            storeId: store.id,
            productId: product.id,
            status: "draft",
            headline: creative.headline,
            description: creative.description,
            cta: creative.cta,
            offerLabel: creative.offerLabel,
            visualPrompt: creative.visualPrompt,
            imageKey: creative.imageKey,
            model: creative.model,
            generationCost: 1,
          });
          return {
            ...ad,
            imageUrl: ad.imageKey
              ? await storageGetSignedUrl(ad.imageKey).catch(() => null)
              : null,
          };
        }),
      publish: protectedProcedure
        .input(z.object({ adId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store) throw new Error("Loja não encontrada");
          const ad = await db.publishGeneratedAd(store.id, input.adId);
          return {
            ...ad,
            imageUrl: ad.imageKey
              ? await storageGetSignedUrl(ad.imageKey).catch(() => null)
              : null,
          };
        }),
      archive: protectedProcedure
        .input(z.object({ adId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (!store) throw new Error("Loja não encontrada");
          await db.archiveGeneratedAd(store.id, input.adId);
          return { success: true as const };
        }),
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
            saleUnit: z.enum(SALE_UNITS).optional(),
            packSize: z
              .string()
              .regex(/^\d+(\.\d{1,3})?$/)
              .nullable()
              .optional(),
            inventoryTracked: z.boolean().default(false),
            stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const store = await db.getStoreForOwner(ctx.user.id);
          if (store?.id !== input.storeId)
            throw new Error("Loja não autorizada");
          return db.createProduct({
            ...input,
            saleUnit: normalizeSaleUnit(
              input.saleUnit ?? (store.kind === "market" ? "unit" : "unit"),
            ),
            packSize: input.packSize ?? null,
            available: 1,
            inventoryTracked: input.inventoryTracked ? 1 : 0,
          });
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
      inventory: protectedProcedure
        .input(
          z.object({
            productId: z.number().int().positive(),
            inventoryTracked: z.boolean(),
            stockQuantity: z.number().int().min(0).max(1_000_000),
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
          return db.updateProductInventory(input);
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
            fulfillmentMode: z.enum(["delivery", "pickup"]).default("delivery"),
            fulfillment: z.enum(["standard", "flash"]).default("standard"),
            tipAmount: z.number().nonnegative().max(500).optional(),
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
            if (
              (existing.storeId !== undefined &&
                existing.storeId !== input.storeId) ||
              (existing.total !== undefined &&
                Number(existing.total) !== Number(input.total)) ||
              (existing.fulfillmentMode !== undefined &&
                existing.fulfillmentMode !== input.fulfillmentMode) ||
              (existing.fulfillment !== undefined &&
                existing.fulfillment !== input.fulfillment)
            )
              throw new Error(
                "A chave de idempotência já foi usada para outro pedido",
              );
            if (input.paymentMethod === "fiado")
              return {
                orderId: existing.id,
                paymentId: null,
                status: existing.status,
              };
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
          await enforceDistributedRateLimit(ctx, {
            scope: "orders:create",
            identity: ctx.user.id,
            limit: 20,
            windowMs: 60_000,
            message:
              "Muitos pedidos em pouco tempo. Tente novamente em instantes.",
          });
          const store = await db.getStoreById(input.storeId);
          if (!store) throw new Error("Estabelecimento não encontrado");
          if (!store.isOpen)
            throw new Error("Estabelecimento fechado no momento");
          if (store.kind === "market" && input.fulfillmentMode === "pickup")
            throw new Error(
              "Compras de mercado são entregues pelo Pediu Entregas; selecione um endereço.",
            );
          const flash = resolveFlashFulfillment(store, input.fulfillment);
          if (
            input.fulfillment === "flash" &&
            (input.fulfillmentMode !== "delivery" || !flash.isFlash)
          )
            throw new Error(flash.reason ?? "Flash indisponível");
          const pricingStore = flash.isFlash
            ? { ...store, deliveryFee: flash.deliveryFee }
            : store;

          const savedAddress = input.addressId
            ? await db.getCustomerAddress(ctx.user.id, input.addressId)
            : undefined;
          if (input.addressId && !savedAddress)
            throw new Error("Endereço não encontrado ou não autorizado");
          if (input.fulfillmentMode === "delivery" && !savedAddress)
            throw new Error(
              "Selecione um endereço salvo com localização para entrega",
            );

          const serviceability = calculateServiceability(
            input.fulfillmentMode,
            pricingStore,
            savedAddress,
          );
          if (!serviceability.serviceable)
            throw new Error(serviceabilityMessage(serviceability));

          let deliveryAddress =
            input.fulfillmentMode === "pickup"
              ? `Retirada em ${store.name}`
              : "";
          if (input.fulfillmentMode === "delivery" && input.addressId) {
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
          const products = await Promise.all(
            input.items.map((item) =>
              db.getAvailableProductForStore(item.productId, input.storeId, {
                allowOutOfStock: true,
              }),
            ),
          );
          if (products.some((p) => !p))
            throw new Error("Há produto inválido ou de outro estabelecimento");
          const subtotal = input.items.reduce(
            (sum, item, i) => sum + Number(products[i]!.price) * item.quantity,
            0,
          );
          const tipAmount = clampTipAmount(input.tipAmount, subtotal);
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
            subtotal +
            Number(serviceability.deliveryFee) -
            Number(discount) +
            Number(tipAmount);
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
          const recoverConcurrentFiadoOrder = async () => {
            const racedOrder = await db.getOrderByIdempotencyKey(
              ctx.user.id,
              idempotencyKey,
            );
            if (!racedOrder) return undefined;
            return {
              orderId: racedOrder.id,
              paymentId: null,
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
            let fiadoOrder: { orderId: number; created: boolean };
            try {
              fiadoOrder = await db.createOrderWithFiado(
                {
                  customerId: ctx.user.id,
                  storeId: input.storeId,
                  total: serverTotal,
                  couponCode,
                  discount,
                  deliveryAddress,
                  fulfillmentMode: input.fulfillmentMode,
                  deliveryFeeSnapshot: serviceability.deliveryFee,
                  isFlash: flash.isFlash ? 1 : 0,
                  tipAmount,
                  tipDestination: DEFAULT_TIP_DESTINATION,
                  fulfillment: input.fulfillment,
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
              const raced = await recoverConcurrentFiadoOrder();
              if (raced) return raced;
              throw error;
            }
            const { orderId } = fiadoOrder;
            if (!fiadoOrder.created) {
              return { orderId, paymentId: null, status: "Pendente" as const };
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
                fulfillmentMode: input.fulfillmentMode,
                deliveryFeeSnapshot: serviceability.deliveryFee,
                isFlash: flash.isFlash ? 1 : 0,
                tipAmount,
                tipDestination: DEFAULT_TIP_DESTINATION,
                fulfillment: input.fulfillment,
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
          if (order.status === input.status) return { success: true as const };
          if (!isOwner) {
            if (
              input.status !== "Cancelado" ||
              !canCustomerCancelOrder(order.status)
            )
              throw new Error(
                "O cliente só pode cancelar pedidos ainda não preparados",
              );
            const updated = await db.transitionOrderStatus(
              input.orderId,
              input.status,
              order.status,
            );
            if (!updated.changed && updated.status !== input.status)
              throw new Error("O pedido mudou durante o cancelamento");
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
          if (
            !canTransitionOrder(
              order.status,
              input.status,
              order.fulfillmentMode,
            )
          )
            throw new Error(
              `Transição de pedido inválida: ${order.status} → ${input.status}`,
            );
          const updated = await db.transitionOrderStatus(
            input.orderId,
            input.status,
            order.status,
          );
          if (!updated.changed) {
            if (updated.status !== input.status)
              throw new Error("O pedido mudou durante a atualização");
            return { success: true as const };
          }
          if (input.status === "Entregue") {
            try {
              await db.creditLoyaltyForDeliveredOrder(input.orderId);
            } catch (error) {
              console.warn(
                "[Loyalty] Failed to credit points for pickup order:",
                error,
              );
            }
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
          const payment = await db.getPaymentForOrder(order.id, ctx.user.id);
          if (!payment || payment.method !== "pix")
            throw new Error("Pedido não configurado para pagamento via PIX");

          const existingTransaction = await db.getPixTransactionForPayment(
            payment.id,
          );
          if (existingTransaction) {
            if (
              existingTransaction.amount !== order.total ||
              existingTransaction.currency !== "BRL" ||
              existingTransaction.externalReference !==
                `pediu-order-${order.id}` ||
              !existingTransaction.providerTransactionId
            ) {
              throw new Error(
                "A cobrança PIX existente não corresponde ao pedido local",
              );
            }
            return {
              paymentId: payment.id,
              amount: order.total,
              provider: "mercado_pago",
              providerChargeId: existingTransaction.providerTransactionId,
              externalReference: existingTransaction.externalReference,
              qrCode: existingTransaction.qrCode,
              qrCodeBase64: existingTransaction.qrCodeBase64,
              ticketUrl: existingTransaction.ticketUrl,
              status: payment.status,
              message: "Cobrança PIX já existente.",
            };
          }
          await enforceDistributedRateLimit(ctx, {
            scope: "payments:create-pix",
            identity: ctx.user.id,
            limit: 10,
            windowMs: 60_000,
            message:
              "Muitas tentativas de cobrança PIX. Tente novamente em instantes.",
          });
          if (payment.status !== "pending")
            throw new Error("Este pagamento PIX não está pendente");

          const idempotencyKey = `pix-order-${order.id}`;
          const charge = await createPixCharge({
            orderId: order.id,
            amount: order.total,
            payerEmail: ctx.user.email ?? "",
            idempotencyKey,
          });
          if (charge.provider === "mercado_pago" && charge.providerChargeId) {
            await db.createMercadoPagoPaymentTransaction({
              paymentId: payment.id,
              providerTransactionId: charge.providerChargeId,
              amount: order.total,
              currency: "BRL",
              idempotencyKey,
              externalReference:
                charge.externalReference ?? `pediu-order-${order.id}`,
              status: charge.status,
              qrCode: charge.qrCode,
              qrCodeBase64: charge.qrCodeBase64,
              ticketUrl: charge.ticketUrl,
            });
          }
          try {
            await sendPushToUser(
              ctx.user.id,
              charge.status === "failed" ? "PIX recusado" : "PIX gerado",
              charge.status === "failed"
                ? `A cobrança PIX do pedido #${order.id} foi recusada.`
                : `A cobrança PIX do pedido #${order.id} está pronta para pagamento.`,
              {
                type: "payment",
                orderId: order.id,
                paymentId: payment.id,
                status: charge.status,
              },
            );
          } catch (error) {
            console.warn(
              "[Payments] Failed to notify customer about PIX creation:",
              error,
            );
          }
          return { paymentId: payment.id, amount: order.total, ...charge };
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
          await enforceDistributedRateLimit(ctx, {
            scope: "voice:interpret",
            limit: 20,
            windowMs: 5 * 60_000,
            message:
              "Limite de comandos de voz atingido. Tente novamente em alguns minutos.",
          });
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
          await enforceDistributedRateLimit(ctx, {
            scope: "voice:transcribe",
            identity: ctx.user.id,
            limit: 10,
            windowMs: 10 * 60_000,
            message:
              "Limite de transcrição atingido. Tente novamente mais tarde.",
          });
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
