import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { requestPixRefund } from "./payments";

const pagination = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const adminRouter = router({
  overview: adminProcedure.query(() => db.getAdminOverview()),

  users: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminUsers(input.limit, input.offset)),

  stores: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminStores(input.limit, input.offset)),

  storeUpdate: adminProcedure
    .input(
      z
        .object({
          storeId: z.number().int().positive(),
          isOpen: z.boolean().optional(),
          flashEnabled: z.boolean().optional(),
          flashEtaMaxMinutes: z.number().int().min(5).max(120).optional(),
          flashFeeOverride: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/)
            .nullable()
            .optional(),
          kind: z.enum(["restaurant", "market", "service"]).optional(),
        })
        .refine(
          (input) =>
            Object.entries(input).some(
              ([key, value]) => key !== "storeId" && value !== undefined,
            ),
          "Informe ao menos uma alteração",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        storeId,
        isOpen,
        flashEnabled,
        flashEtaMaxMinutes,
        flashFeeOverride,
        kind,
      } = input;
      const store = await db.adminUpdateStore(storeId, {
        ...(isOpen === undefined ? {} : { isOpen: isOpen ? 1 : 0 }),
        ...(flashEnabled === undefined
          ? {}
          : { flashEnabled: flashEnabled ? 1 : 0 }),
        ...(flashEtaMaxMinutes === undefined ? {} : { flashEtaMaxMinutes }),
        ...(flashFeeOverride === undefined ? {} : { flashFeeOverride }),
        ...(kind === undefined ? {} : { kind }),
      });
      await db.createAdminAuditLog({
        actorId: ctx.user.id,
        action: "store_updated",
        entityType: "store",
        entityId: storeId,
        metadata: JSON.stringify({
          isOpen,
          flashEnabled,
          flashEtaMaxMinutes,
          flashFeeOverride,
          kind,
        }),
      });
      return store;
    }),

  orders: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminOrders(input.limit, input.offset)),

  payments: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminPayments(input.limit, input.offset)),

  refunds: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listPaymentRefunds(input.limit, input.offset)),

  refund: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int().positive(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        idempotencyKey: z.string().trim().min(8).max(160),
        reason: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const provider = (process.env.PIX_PROVIDER ?? "manual")
        .trim()
        .toLowerCase();
      const refund = await db.createPaymentRefund({ ...input, provider });
      if (refund.status === "refunded" || refund.status === "processing")
        return refund;
      try {
        const result = await requestPixRefund({
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          transactionId:
            (await db.getPaymentById(refund.paymentId))?.transactionId ?? "",
          amount: refund.amount,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason,
        });
        const updated = await db.updatePaymentRefund(refund.id, result);
        await db.createAdminAuditLog({
          actorId: ctx.user.id,
          action: "payment_refund_requested",
          entityType: "refund",
          entityId: refund.id,
          metadata: JSON.stringify({ provider, status: updated.status }),
        });
        return updated;
      } catch (error) {
        await db.updatePaymentRefund(refund.id, { status: "failed" });
        throw error;
      }
    }),

  reconcilePayments: adminProcedure
    .input(
      z.object({
        provider: z.string().trim().min(2).max(40),
        idempotencyKey: z.string().trim().min(8).max(160),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        records: z
          .array(
            z.object({
              providerTransactionId: z.string().trim().min(1).max(160),
              status: z.string().trim().min(1).max(32),
              amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
              currency: z.literal("BRL"),
            }),
          )
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.periodEnd < input.periodStart)
        throw new Error("Período de reconciliação inválido");
      const result = await db.reconcilePaymentRecords(input);
      await db.createAdminAuditLog({
        actorId: ctx.user.id,
        action: "payment_reconciliation_completed",
        entityType: "payment_reconciliation_run",
        entityId: result.id,
        metadata: JSON.stringify({
          provider: input.provider,
          mismatches: result.mismatchCount,
        }),
      });
      return result;
    }),

  reconciliationRuns: adminProcedure
    .input(pagination)
    .query(({ input }) =>
      db.listPaymentReconciliationRuns(input.limit, input.offset),
    ),

  reconciliationItems: adminProcedure
    .input(
      z.object({
        runId: z.number().int().positive(),
        limit: z.number().int().min(1).max(500).default(500),
      }),
    )
    .query(({ input }) =>
      db.listPaymentReconciliationItems(input.runId, input.limit),
    ),

  support: adminProcedure
    .input(pagination)
    .query(({ input }) =>
      db.listAdminSupportTickets(input.limit, input.offset),
    ),

  supportStatus: adminProcedure
    .input(
      z.object({
        ticketId: z.number().int().positive(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateSupportTicketStatus(input.ticketId, input.status);
      await db.createAdminAuditLog({
        actorId: ctx.user.id,
        action: "support_ticket_status_updated",
        entityType: "support_ticket",
        entityId: input.ticketId,
        metadata: JSON.stringify({ status: input.status }),
      });
      return { success: true as const };
    }),

  credit: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminCustomers(input.limit, input.offset)),

  ledger: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminLedgerEntries(input.limit, input.offset)),

  audit: adminProcedure
    .input(pagination)
    .query(({ input }) => db.listAdminAuditLogs(input.limit, input.offset)),

  couriers: adminProcedure
    .input(pagination)
    .query(({ input }) =>
      db.listAdminCourierProfiles(input.limit, input.offset),
    ),

  courierReview: adminProcedure
    .input(
      z.object({
        profileId: z.number().int().positive(),
        status: z.enum(["approved", "rejected", "suspended"]),
        reason: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await db.reviewCourierProfile(
        input.profileId,
        input.status,
        input.reason,
      );
      await db.createAdminAuditLog({
        actorId: ctx.user.id,
        action: `courier_${input.status}`,
        entityType: "courier_profile",
        entityId: input.profileId,
        metadata: JSON.stringify({
          status: input.status,
          reason: input.reason ?? null,
        }),
      });
      return profile;
    }),
});
