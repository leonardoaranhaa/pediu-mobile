import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "merchant", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const stores = mysqlTable("pediu_stores", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: varchar("address", { length: 255 }),
  pixKey: varchar("pixKey", { length: 255 }),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isOpen: int("isOpen").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ ownerUnique: unique("pediu_stores_owner_unique").on(table.ownerId) }));

export const products = mysqlTable("pediu_products", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  available: int("available").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orders = mysqlTable("pediu_orders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  storeId: int("storeId").notNull(),
  status: mysqlEnum("status", ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue", "Cancelado"]).default("Pendente").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: varchar("deliveryAddress", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("pediu_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
});

export const payments = mysqlTable("pediu_payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  method: mysqlEnum("method", ["pix", "card", "cash", "fiado"]).default("pix").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled"]).default("pending").notNull(),
  pixKey: varchar("pixKey", { length: 255 }),
  transactionId: varchar("transactionId", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customers = mysqlTable("pediu_customers", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  userId: int("userId"),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  notes: text("notes"),
  creditLimit: decimal("creditLimit", { precision: 10, scale: 2 }).default("0.00").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["active", "blocked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ledgerEntries = mysqlTable("pediu_ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  customerId: int("customerId").notNull(),
  orderId: int("orderId"),
  type: mysqlEnum("type", ["credit", "payment", "adjustment", "reversal"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sales = mysqlTable("pediu_sales", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  customerId: int("customerId"),
  orderId: int("orderId"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "card", "cash", "fiado"]).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pushTokens = mysqlTable("pediu_push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  platform: varchar("platform", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("pediu_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 40 }).default("general").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
