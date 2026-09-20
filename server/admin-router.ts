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

  credit: adminProcedure.input(pagination).query(({ input }) => db.listAdminCustomers(input.limit, input.offset)),

  ledger: adminProcedure.input(pagination).query(({ input }) => db.listAdminLedgerEntries(input.limit, input.offset)),

  audit: adminProcedure.input(pagination).query(({ input }) => db.listAdminAuditLogs(input.limit, input.offset)),
});
