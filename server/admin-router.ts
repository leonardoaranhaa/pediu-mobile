import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";

const pagination = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const adminRouter = router({
  users: adminProcedure.input(pagination).query(({ input }) => db.listAdminUsers(input.limit, input.offset)),

  stores: adminProcedure.input(pagination).query(({ input }) => db.listAdminStores(input.limit, input.offset)),

  orders: adminProcedure.input(pagination).query(({ input }) => db.listAdminOrders(input.limit, input.offset)),

  payments: adminProcedure.input(pagination).query(({ input }) => db.listAdminPayments(input.limit, input.offset)),

  support: adminProcedure.input(pagination).query(({ input }) => db.listAdminSupportTickets(input.limit, input.offset)),

  supportStatus: adminProcedure.input(z.object({ ticketId: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]) })).mutation(async ({ ctx, input }) => { await db.updateSupportTicketStatus(input.ticketId, input.status); await db.createAdminAuditLog({ actorId: ctx.user.id, action: "support_ticket_status_updated", entityType: "support_ticket", entityId: input.ticketId, metadata: JSON.stringify({ status: input.status }) }); return { success: true as const }; }),

  credit: adminProcedure.input(pagination).query(({ input }) => db.listAdminCustomers(input.limit, input.offset)),

  ledger: adminProcedure.input(pagination).query(({ input }) => db.listAdminLedgerEntries(input.limit, input.offset)),

  audit: adminProcedure.input(pagination).query(({ input }) => db.listAdminAuditLogs(input.limit, input.offset)),

  couriers: adminProcedure.input(pagination).query(({ input }) => db.listAdminCourierProfiles(input.limit, input.offset)),

  courierReview: adminProcedure.input(z.object({ profileId: z.number().int().positive(), status: z.enum(["approved", "rejected", "suspended"]), reason: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => {
    const profile = await db.reviewCourierProfile(input.profileId, input.status, input.reason);
    await db.createAdminAuditLog({ actorId: ctx.user.id, action: `courier_${input.status}`, entityType: "courier_profile", entityId: input.profileId, metadata: JSON.stringify({ status: input.status, reason: input.reason ?? null }) });
    return profile;
  }),
});
