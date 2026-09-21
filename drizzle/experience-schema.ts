import { int, mysqlEnum, mysqlTable, timestamp, unique, varchar, index } from "drizzle-orm/mysql-core";

export const mfaChallenges = mysqlTable("pediu_mfa_challenges", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), channel: mysqlEnum("channel", ["sms", "whatsapp", "email"]).notNull(), destination: varchar("destination", { length: 320 }).notNull(), codeHash: varchar("codeHash", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), consumedAt: timestamp("consumedAt"), attempts: int("attempts").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull()
}, t => ({ userCreatedIdx: index("pediu_mfa_user_created_idx").on(t.userId, t.createdAt) }));

export const courierProfiles = mysqlTable("pediu_courier_profiles", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull().unique(), phone: varchar("phone", { length: 32 }), active: int("active").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull()
});

export const courierAssignments = mysqlTable("pediu_courier_assignments", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), courierUserId: int("courierUserId").notNull(), active: int("active").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull()
}, t => ({ assignmentUnique: unique("pediu_courier_assignment_unique").on(t.orderId, t.courierUserId), orderIdx: index("pediu_courier_assignment_order_idx").on(t.orderId) }));
