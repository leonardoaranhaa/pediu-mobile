import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar, index } from "drizzle-orm/mysql-core";

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
}, (table) => ({
  ownerUnique: unique("pediu_stores_owner_unique").on(table.ownerId),
  openIdx: index("pediu_stores_open_idx").on(table.isOpen),
}));

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
  couponCode: varchar("couponCode", { length: 40 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  deliveryAddress: varchar("deliveryAddress", { length: 255 }),
  idempotencyKey: varchar("idempotencyKey", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerCreatedIdx: index("pediu_orders_customer_created_idx").on(table.customerId, table.createdAt),
  storeStatusCreatedIdx: index("pediu_orders_store_status_created_idx").on(table.storeId, table.status, table.createdAt),
  idempotencyUnique: unique("pediu_orders_idempotency_unique").on(table.idempotencyKey),
}));

export const orderItems = mysqlTable("pediu_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  note: varchar("note", { length: 500 }),
}, (table) => ({
  orderIdx: index("pediu_order_items_order_idx").on(table.orderId),
}));

export const payments = mysqlTable("pediu_payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  method: mysqlEnum("method", ["pix", "card", "cash", "fiado"]).default("pix").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled"]).default("pending").notNull(),
  pixKey: varchar("pixKey", { length: 255 }),
  transactionId: varchar("transactionId", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  transactionUnique: unique("pediu_payments_transaction_unique").on(table.transactionId),
  orderStatusIdx: index("pediu_payments_order_status_idx").on(table.orderId, table.status),
}));


export const paymentAccounts = mysqlTable("pediu_payment_accounts", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 160 }),
  onboardingStatus: mysqlEnum("onboardingStatus", ["pending", "active", "restricted", "disabled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  storeUnique: unique("pediu_payment_accounts_store_unique").on(table.storeId),
  providerAccountUnique: unique("pediu_payment_accounts_provider_account_unique").on(table.provider, table.providerAccountId),
}));

export const paymentTransactions = mysqlTable("pediu_payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 160 }),
  status: mysqlEnum("status", ["pending", "authorized", "paid", "failed", "refunded", "cancelled"]).default("pending").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  gatewayFee: decimal("gatewayFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerTransactionUnique: unique("pediu_payment_transactions_provider_tx_unique").on(table.provider, table.providerTransactionId),
  idempotencyUnique: unique("pediu_payment_transactions_idempotency_unique").on(table.provider, table.idempotencyKey),
}));

export const commissionRules = mysqlTable("pediu_commission_rules", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId"),
  type: mysqlEnum("type", ["percentage", "fixed", "hybrid"]).notNull(),
  percentage: decimal("percentage", { precision: 7, scale: 4 }).default("0.0000").notNull(),
  fixedAmount: decimal("fixedAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  activeFrom: timestamp("activeFrom").defaultNow().notNull(),
  activeUntil: timestamp("activeUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const commissionEntries = mysqlTable("pediu_commission_entries", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  paymentId: int("paymentId"),
  ruleId: int("ruleId"),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const financialLedger = mysqlTable("pediu_financial_ledger", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  orderId: int("orderId"),
  paymentId: int("paymentId"),
  type: mysqlEnum("type", ["sale", "gateway_fee", "commission", "receivable", "payout", "refund", "adjustment"]).notNull(),
  direction: mysqlEnum("direction", ["credit", "debit"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  referenceId: varchar("referenceId", { length: 160 }),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payouts = mysqlTable("pediu_payouts", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerPayoutId: varchar("providerPayoutId", { length: 160 }),
  status: mysqlEnum("status", ["pending", "processing", "paid", "failed", "cancelled"]).default("pending").notNull(),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  fees: decimal("fees", { precision: 10, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerPayoutUnique: unique("pediu_payouts_provider_payout_unique").on(table.provider, table.providerPayoutId),
}));

export const refunds = mysqlTable("pediu_refunds", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull(),
  orderId: int("orderId").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerRefundId: varchar("providerRefundId", { length: 160 }),
  status: mysqlEnum("status", ["pending", "processing", "refunded", "failed"]).default("pending").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  providerRefundUnique: unique("pediu_refunds_provider_refund_unique").on(table.provider, table.providerRefundId),
}));

export const webhookEvents = mysqlTable("pediu_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "ignored", "failed"]).default("received").notNull(),
  payload: text("payload"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerEventUnique: unique("pediu_webhook_events_provider_event_unique").on(table.provider, table.providerEventId),
}));

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
}, (table) => ({
  userStoreUnique: unique("pediu_customers_store_user_unique").on(table.storeId, table.userId),
  storeIdx: index("pediu_customers_store_idx").on(table.storeId),
}));

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
}, (table) => ({
  storeCustomerCreatedIdx: index("pediu_ledger_store_customer_created_idx").on(table.storeId, table.customerId, table.createdAt),
}));

export const sales = mysqlTable("pediu_sales", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  customerId: int("customerId"),
  orderId: int("orderId"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "card", "cash", "fiado"]).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  storeCreatedIdx: index("pediu_sales_store_created_idx").on(table.storeId, table.createdAt),
}));

export const pushTokens = mysqlTable("pediu_push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  platform: varchar("platform", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("pediu_push_tokens_user_idx").on(table.userId),
}));

export const customerAddresses = mysqlTable("pediu_customer_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 40 }).notNull(),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  street: varchar("street", { length: 180 }).notNull(),
  number: varchar("number", { length: 30 }).notNull(),
  complement: varchar("complement", { length: 120 }),
  neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  postalCode: varchar("postalCode", { length: 8 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isDefault: int("isDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const coupons = mysqlTable("pediu_coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: varchar("type", { length: 16 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minSubtotal: decimal("minSubtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
  active: int("active").default(1).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orderReviews = mysqlTable("pediu_order_reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  userId: int("userId").notNull(),
  target: varchar("target", { length: 16 }).notNull(),
  productId: int("productId"),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  reviewUnique: unique("pediu_review_unique").on(table.orderId, table.userId, table.target, table.productId),
  orderIdx: index("pediu_review_order_idx").on(table.orderId),
}));

export const deliveryEvents = mysqlTable("pediu_delivery_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderCreatedIdx: index("pediu_delivery_events_order_created_idx").on(table.orderId, table.createdAt),
}));

export const deliveryAssignments = mysqlTable("pediu_delivery_assignments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  courierId: int("courierId").notNull(),
  courierName: varchar("courierName", { length: 160 }).notNull(),
  courierPhone: varchar("courierPhone", { length: 32 }),
  etaMinutes: int("etaMinutes"),
  status: mysqlEnum("status", ["assigned", "in_transit", "delivered", "cancelled"]).default("assigned").notNull(),
  currentLatitude: decimal("currentLatitude", { precision: 10, scale: 7 }),
  currentLongitude: decimal("currentLongitude", { precision: 10, scale: 7 }),
  lastLocationAt: timestamp("lastLocationAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderUnique: unique("pediu_delivery_assignment_order_unique").on(table.orderId),
  courierIdx: index("pediu_delivery_assignment_courier_idx").on(table.courierId, table.status),
}));

export const deliveryLocations = mysqlTable("pediu_delivery_locations", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(),
  orderId: int("orderId").notNull(),
  courierId: int("courierId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  etaMinutes: int("etaMinutes"),
  idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  idempotencyUnique: unique("pediu_delivery_location_idempotency_unique").on(table.idempotencyKey),
  assignmentCreatedIdx: index("pediu_delivery_location_assignment_created_idx").on(table.assignmentId, table.createdAt),
}));

export const chatMessages = mysqlTable("pediu_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderCreatedIdx: index("pediu_chat_order_created_idx").on(table.orderId, table.createdAt),
}));

export const supportTickets = mysqlTable("pediu_support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  subject: varchar("subject", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("pediu_support_user_created_idx").on(table.userId, table.createdAt),
  orderIdx: index("pediu_support_order_idx").on(table.orderId),
}));

export const privacyConsents = mysqlTable("pediu_privacy_consents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
}, (table) => ({
  consentUnique: unique("pediu_privacy_consent_unique").on(table.userId, table.kind, table.version),
  userIdx: index("pediu_privacy_consent_user_idx").on(table.userId),
}));

export const adminAuditLogs = mysqlTable("pediu_admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: int("entityId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  createdIdx: index("pediu_admin_audit_created_idx").on(table.createdAt),
}));

export const notifications = mysqlTable("pediu_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 40 }).default("general").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userReadCreatedIdx: index("pediu_notifications_user_read_created_idx").on(table.userId, table.readAt, table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type CommissionRule = typeof commissionRules.$inferSelect;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type FinancialLedgerEntry = typeof financialLedger.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = typeof customerAddresses.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;
export type OrderReview = typeof orderReviews.$inferSelect;
export type InsertOrderReview = typeof orderReviews.$inferInsert;
export type DeliveryEvent = typeof deliveryEvents.$inferSelect;
export type InsertDeliveryEvent = typeof deliveryEvents.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;
export type InsertDeliveryAssignment = typeof deliveryAssignments.$inferInsert;
export type DeliveryLocation = typeof deliveryLocations.$inferSelect;
export type InsertDeliveryLocation = typeof deliveryLocations.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type PrivacyConsent = typeof privacyConsents.$inferSelect;
export type InsertPrivacyConsent = typeof privacyConsents.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
