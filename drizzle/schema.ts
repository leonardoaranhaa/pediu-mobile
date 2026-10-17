import {
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const accountRoleValues = [
  "customer",
  "merchant",
  "courier",
  "admin",
] as const;
export type AccountRole = (typeof accountRoleValues)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).$type<"user" | "merchant" | "courier" | "admin">()
    .default("user")
    .notNull(),
  themePreference: varchar("themePreference", { length: 16 })
    .default("classic")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}).enableRLS();

/** Several profiles can belong to the same person. `users.role` stays as a legacy label and is not overwritten. */
export const accountRoles = pgTable(
  "pediu_account_roles",
  {
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).$type<"customer" | "merchant" | "courier" | "admin">().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.role] }),
  }),
).enableRLS();

export const emailVerificationTokens = pgTable(
  "pediu_email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("pediu_email_verification_user_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const stores = pgTable(
  "pediu_stores",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    address: varchar("address", { length: 255 }),
    pixKey: varchar("pixKey", { length: 255 }),
    deliveryFee: numeric("deliveryFee", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    deliveryEnabled: integer("deliveryEnabled").default(1).notNull(),
    pickupEnabled: integer("pickupEnabled").default(0).notNull(),
    deliveryRadiusKm: numeric("deliveryRadiusKm", {
      precision: 6,
      scale: 2,
    })
      .default("10.00")
      .notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isOpen: integer("isOpen").default(1).notNull(),
    kind: varchar("kind", { length: 32 }).$type<"restaurant" | "market" | "service">()
      .default("restaurant")
      .notNull(),
    flashEnabled: integer("flashEnabled").default(0).notNull(),
    flashEtaMaxMinutes: integer("flashEtaMaxMinutes").default(30).notNull(),
    flashFeeOverride: numeric("flashFeeOverride", {
      precision: 10,
      scale: 2,
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    ownerUnique: unique("pediu_stores_owner_unique").on(table.ownerId),
    openIdx: index("pediu_stores_open_idx").on(table.isOpen),
    flashIdx: index("pediu_stores_flash_idx").on(
      table.flashEnabled,
      table.isOpen,
    ),
    kindIdx: index("pediu_stores_kind_idx").on(table.kind, table.isOpen),
  }),
).enableRLS();

export const products = pgTable(
  "pediu_products",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    saleUnit: varchar("saleUnit", { length: 32 }).$type<"unit" | "kg" | "g" | "L" | "ml" | "pack">()
      .default("unit")
      .notNull(),
    packSize: numeric("packSize", { precision: 10, scale: 3 }),
    available: integer("available").default(1).notNull(),
    inventoryTracked: integer("inventoryTracked").default(0).notNull(),
    stockQuantity: integer("stockQuantity").default(0).notNull(),
    reservedQuantity: integer("reservedQuantity").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    inventoryIdx: index("pediu_products_inventory_idx").on(
      table.storeId,
      table.inventoryTracked,
      table.available,
    ),
  }),
).enableRLS();

export const orders = pgTable(
  "pediu_orders",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customerId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).$type<"Pendente" | "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | "Cancelado">()
      .default("Pendente")
      .notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    couponCode: varchar("couponCode", { length: 40 }),
    discount: numeric("discount", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    deliveryAddress: varchar("deliveryAddress", { length: 255 }),
    fulfillmentMode: varchar("fulfillmentMode", { length: 32 }).$type<"delivery" | "pickup">()
      .default("delivery")
      .notNull(),
    deliveryFeeSnapshot: numeric("deliveryFeeSnapshot", {
      precision: 10,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    isFlash: integer("isFlash").default(0).notNull(),
    tipAmount: numeric("tipAmount", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    tipDestination: varchar("tipDestination", { length: 32 }).$type<"courier" | "store" | "platform_pool">()
      .default("courier")
      .notNull(),
    fulfillment: varchar("fulfillment", { length: 16 })
      .default("standard")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    customerCreatedIdx: index("pediu_orders_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
    storeStatusCreatedIdx: index("pediu_orders_store_status_created_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    idempotencyUnique: unique("pediu_orders_idempotency_unique").on(
      table.idempotencyKey,
    ),
  }),
).enableRLS();

export const orderItems = pgTable(
  "pediu_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: numeric("unitPrice", { precision: 10, scale: 2 }).notNull(),
    note: varchar("note", { length: 500 }),
  },
  (table) => ({
    orderIdx: index("pediu_order_items_order_idx").on(table.orderId),
    productIdx: index("pediu_order_items_product_idx").on(table.productId),
  }),
).enableRLS();

export const payments = pgTable(
  "pediu_payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 32 }).$type<"pix" | "card" | "cash" | "fiado">()
      .default("pix")
      .notNull(),
    status: varchar("status", { length: 32 }).$type<"pending" | "paid" | "failed" | "cancelled">()
      .default("pending")
      .notNull(),
    pixKey: varchar("pixKey", { length: 255 }),
    transactionId: varchar("transactionId", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    transactionUnique: unique("pediu_payments_transaction_unique").on(
      table.transactionId,
    ),
    orderStatusIdx: index("pediu_payments_order_status_idx").on(
      table.orderId,
      table.status,
    ),
  }),
).enableRLS();

export const customerPaymentPreferences = pgTable(
  "pediu_customer_payment_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pixEnabled: integer("pixEnabled").default(1).notNull(),
    cardEnabled: integer("cardEnabled").default(0).notNull(),
    cashEnabled: integer("cashEnabled").default(1).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userUnique: unique("pediu_customer_payment_preferences_user_unique").on(
      table.userId,
    ),
  }),
).enableRLS();

export const paymentAccounts = pgTable(
  "pediu_payment_accounts",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId").notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 160 }),
    onboardingStatus: varchar("onboardingStatus", { length: 32 }).$type<"pending" | "active" | "restricted" | "disabled">()
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    storeUnique: unique("pediu_payment_accounts_store_unique").on(
      table.storeId,
    ),
    providerAccountUnique: unique(
      "pediu_payment_accounts_provider_account_unique",
    ).on(table.provider, table.providerAccountId),
  }),
).enableRLS();

export const paymentTransactions = pgTable(
  "pediu_payment_transactions",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("paymentId").notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerTransactionId: varchar("providerTransactionId", { length: 160 }),
    status: varchar("status", { length: 32 }).$type<"pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled">()
      .default("pending")
      .notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    gatewayFee: numeric("gatewayFee", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    externalReference: varchar("externalReference", { length: 255 }),
    qrCode: text("qrCode"),
    qrCodeBase64: text("qrCodeBase64"),
    ticketUrl: varchar("ticketUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    providerTransactionUnique: unique(
      "pediu_payment_transactions_provider_tx_unique",
    ).on(table.provider, table.providerTransactionId),
    idempotencyUnique: unique(
      "pediu_payment_transactions_idempotency_unique",
    ).on(table.provider, table.idempotencyKey),
  }),
).enableRLS();

export const commissionRules = pgTable("pediu_commission_rules", {
  id: serial("id").primaryKey(),
  storeId: integer("storeId"),
  type: varchar("type", { length: 32 }).$type<"percentage" | "fixed" | "hybrid">().notNull(),
  percentage: numeric("percentage", { precision: 7, scale: 4 })
    .default("0.0000")
    .notNull(),
  fixedAmount: numeric("fixedAmount", { precision: 10, scale: 2 })
    .default("0.00")
    .notNull(),
  activeFrom: timestamp("activeFrom").defaultNow().notNull(),
  activeUntil: timestamp("activeUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const commissionEntries = pgTable("pediu_commission_entries", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  paymentId: integer("paymentId"),
  ruleId: integer("ruleId"),
  grossAmount: numeric("grossAmount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: numeric("commissionAmount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const financialLedger = pgTable("pediu_financial_ledger", {
  id: serial("id").primaryKey(),
  storeId: integer("storeId").notNull(),
  orderId: integer("orderId"),
  paymentId: integer("paymentId"),
  type: varchar("type", { length: 32 }).$type<"sale" | "gateway_fee" | "commission" | "receivable" | "payout" | "refund" | "adjustment" | "tip">().notNull(),
  direction: varchar("direction", { length: 32 }).$type<"credit" | "debit">().notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  referenceId: varchar("referenceId", { length: 160 }),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const tipSettlements = pgTable(
  "pediu_tip_settlements",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    destination: varchar("destination", { length: 32 }).$type<"courier" | "store" | "platform_pool">()
      .default("courier")
      .notNull(),
    recipientUserId: integer("recipientUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 32 }).$type<"pending" | "settled" | "reversed">()
      .default("pending")
      .notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    settledAt: timestamp("settledAt"),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_tip_settlements_idempotency_unique").on(
      table.idempotencyKey,
    ),
    orderUnique: unique("pediu_tip_settlements_order_unique").on(table.orderId),
    storeCreatedIdx: index("pediu_tip_settlements_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
    recipientIdx: index("pediu_tip_settlements_recipient_idx").on(
      table.recipientUserId,
      table.status,
    ),
  }),
).enableRLS();

/** Pediu Junto: estrutura persistida, ainda bloqueada pela feature flag. */
export const orderShares = pgTable(
  "pediu_order_shares",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").references(() => orders.id, {
      onDelete: "set null",
    }),
    hostUserId: integer("hostUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).$type<"draft" | "open" | "locked" | "paid" | "cancelled">()
      .default("draft")
      .notNull(),
    inviteCode: varchar("inviteCode", { length: 32 }).notNull(),
    maxParticipants: integer("maxParticipants").default(6).notNull(),
    hostPaysAll: integer("hostPaysAll").default(1).notNull(),
    note: varchar("note", { length: 255 }),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    inviteUnique: unique("pediu_order_shares_invite_unique").on(
      table.inviteCode,
    ),
    idempotencyUnique: unique("pediu_order_shares_idempotency_unique").on(
      table.idempotencyKey,
    ),
    orderIdx: index("pediu_order_shares_order_idx").on(table.orderId),
    hostCreatedIdx: index("pediu_order_shares_host_created_idx").on(
      table.hostUserId,
      table.createdAt,
    ),
    storeStatusIdx: index("pediu_order_shares_store_status_idx").on(
      table.storeId,
      table.status,
    ),
  }),
).enableRLS();

export const orderShareParticipants = pgTable(
  "pediu_order_share_participants",
  {
    id: serial("id").primaryKey(),
    shareId: integer("shareId")
      .notNull()
      .references(() => orderShares.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).$type<"host" | "guest">().default("guest").notNull(),
    status: varchar("status", { length: 32 }).$type<"invited" | "joined" | "left">()
      .default("invited")
      .notNull(),
    joinedAt: timestamp("joinedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    shareUserUnique: unique("pediu_order_share_participants_unique").on(
      table.shareId,
      table.userId,
    ),
    userIdx: index("pediu_order_share_participants_user_idx").on(
      table.userId,
      table.status,
    ),
  }),
).enableRLS();

export const payouts = pgTable(
  "pediu_payouts",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId").notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerPayoutId: varchar("providerPayoutId", { length: 160 }),
    status: varchar("status", { length: 32 }).$type<"pending" | "processing" | "paid" | "failed" | "cancelled">()
      .default("pending")
      .notNull(),
    grossAmount: numeric("grossAmount", { precision: 10, scale: 2 }).notNull(),
    fees: numeric("fees", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    netAmount: numeric("netAmount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    scheduledAt: timestamp("scheduledAt"),
    paidAt: timestamp("paidAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    providerPayoutUnique: unique("pediu_payouts_provider_payout_unique").on(
      table.provider,
      table.providerPayoutId,
    ),
  }),
).enableRLS();

export const refunds = pgTable(
  "pediu_refunds",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("paymentId").notNull(),
    orderId: integer("orderId").notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerRefundId: varchar("providerRefundId", { length: 160 }),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    status: varchar("status", { length: 32 }).$type<"pending" | "processing" | "refunded" | "failed">()
      .default("pending")
      .notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    providerRefundUnique: unique("pediu_refunds_provider_refund_unique").on(
      table.provider,
      table.providerRefundId,
    ),
    providerRefundIdempotencyUnique: unique(
      "pediu_refunds_provider_idempotency_unique",
    ).on(table.provider, table.idempotencyKey),
  }),
).enableRLS();

export const webhookEvents = pgTable(
  "pediu_webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    status: varchar("status", { length: 32 }).$type<"received" | "processed" | "ignored" | "failed">()
      .default("received")
      .notNull(),
    payload: text("payload"),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    providerEventUnique: unique(
      "pediu_webhook_events_provider_event_unique",
    ).on(table.provider, table.providerEventId),
  }),
).enableRLS();

export const paymentReconciliationRuns = pgTable(
  "pediu_payment_reconciliation_runs",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 40 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    status: varchar("status", { length: 32 }).$type<"running" | "completed" | "failed">()
      .default("running")
      .notNull(),
    matchedCount: integer("matchedCount").default(0).notNull(),
    mismatchCount: integer("mismatchCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    providerIdempotencyUnique: unique(
      "pediu_payment_reconciliation_provider_idempotency_unique",
    ).on(table.provider, table.idempotencyKey),
  }),
).enableRLS();

export const paymentReconciliationItems = pgTable(
  "pediu_payment_reconciliation_items",
  {
    id: serial("id").primaryKey(),
    runId: integer("runId")
      .notNull()
      .references(() => paymentReconciliationRuns.id, { onDelete: "cascade" }),
    providerTransactionId: varchar("providerTransactionId", {
      length: 160,
    }).notNull(),
    paymentId: integer("paymentId"),
    orderId: integer("orderId"),
    classification: varchar("classification", { length: 32 }).$type<"matched" | "missing_internal" | "missing_provider" | "amount_mismatch" | "currency_mismatch" | "status_mismatch" | "duplicate">().notNull(),
    providerStatus: varchar("providerStatus", { length: 32 }).notNull(),
    internalStatus: varchar("internalStatus", { length: 32 }),
    providerAmount: numeric("providerAmount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    internalAmount: numeric("internalAmount", {
      precision: 10,
      scale: 2,
    }),
    currency: varchar("currency", { length: 3 }).notNull(),
    details: varchar("details", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    runProviderTransactionUnique: unique(
      "pediu_payment_reconciliation_run_transaction_unique",
    ).on(table.runId, table.providerTransactionId),
    runCreatedIdx: index("pediu_payment_reconciliation_run_created_idx").on(
      table.runId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const customers = pgTable(
  "pediu_customers",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId").notNull(),
    userId: integer("userId"),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    notes: text("notes"),
    creditLimit: numeric("creditLimit", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    balance: numeric("balance", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    status: varchar("status", { length: 32 }).$type<"active" | "blocked">()
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userStoreUnique: unique("pediu_customers_store_user_unique").on(
      table.storeId,
      table.userId,
    ),
    storeIdx: index("pediu_customers_store_idx").on(table.storeId),
  }),
).enableRLS();

export const ledgerEntries = pgTable(
  "pediu_ledger_entries",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId").notNull(),
    customerId: integer("customerId").notNull(),
    orderId: integer("orderId"),
    type: varchar("type", { length: 32 }).$type<"credit" | "payment" | "adjustment" | "reversal">().notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric("balanceAfter", { precision: 10, scale: 2 }),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    storeCustomerCreatedIdx: index(
      "pediu_ledger_store_customer_created_idx",
    ).on(table.storeId, table.customerId, table.createdAt),
  }),
).enableRLS();

export const sales = pgTable(
  "pediu_sales",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId").notNull(),
    customerId: integer("customerId"),
    orderId: integer("orderId"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar("paymentMethod", { length: 32 }).$type<"pix" | "card" | "cash" | "fiado">().notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    storeCreatedIdx: index("pediu_sales_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const pushTokens = pgTable(
  "pediu_push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    platform: varchar("platform", { length: 32 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("pediu_push_tokens_user_idx").on(table.userId),
  }),
).enableRLS();

export const customerAddresses = pgTable(
  "pediu_customer_addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 40 }).notNull(),
    recipientName: varchar("recipientName", { length: 160 }).notNull(),
    street: varchar("street", { length: 180 }).notNull(),
    number: varchar("number", { length: 30 }).notNull(),
    complement: varchar("complement", { length: 120 }),
    neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    postalCode: varchar("postalCode", { length: 8 }).notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isDefault: integer("isDefault").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userIdx: index("pediu_customer_addresses_user_idx").on(table.userId),
  }),
).enableRLS();

export const coupons = pgTable("pediu_coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: varchar("type", { length: 16 }).notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minSubtotal: numeric("minSubtotal", { precision: 10, scale: 2 })
    .default("0.00")
    .notNull(),
  maxDiscount: numeric("maxDiscount", { precision: 10, scale: 2 }),
  active: integer("active").default(1).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const orderReviews = pgTable(
  "pediu_order_reviews",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    userId: integer("userId").notNull(),
    target: varchar("target", { length: 16 }).notNull(),
    productId: integer("productId"),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    reviewUnique: unique("pediu_review_unique").on(
      table.orderId,
      table.userId,
      table.target,
      table.productId,
    ),
    idempotencyUnique: unique("pediu_review_idempotency_unique").on(
      table.idempotencyKey,
    ),
    orderIdx: index("pediu_review_order_idx").on(table.orderId),
  }),
).enableRLS();

export const deliveryEvents = pgTable(
  "pediu_delivery_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventType: varchar("eventType", { length: 32 }).notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    orderCreatedIdx: index("pediu_delivery_events_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const deliveryAssignments = pgTable(
  "pediu_delivery_assignments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courierId: integer("courierId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    courierName: varchar("courierName", { length: 160 }).notNull(),
    courierPhone: varchar("courierPhone", { length: 32 }),
    etaMinutes: integer("etaMinutes"),
    status: varchar("status", { length: 32 }).$type<"assigned" | "in_transit" | "delivered" | "cancelled">()
      .default("assigned")
      .notNull(),
    currentLatitude: numeric("currentLatitude", { precision: 10, scale: 7 }),
    currentLongitude: numeric("currentLongitude", { precision: 10, scale: 7 }),
    lastLocationAt: timestamp("lastLocationAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    orderUnique: unique("pediu_delivery_assignment_order_unique").on(
      table.orderId,
    ),
    courierIdx: index("pediu_delivery_assignment_courier_idx").on(
      table.courierId,
      table.status,
    ),
  }),
).enableRLS();

export const courierProfiles = pgTable(
  "pediu_courier_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).$type<"pending" | "approved" | "rejected" | "suspended">()
      .default("pending")
      .notNull(),
    vehicleType: varchar("vehicleType", { length: 32 }).$type<"bike" | "moto" | "car">().notNull(),
    vehiclePlate: varchar("vehiclePlate", { length: 16 }),
    phone: varchar("phone", { length: 32 }),
    availability: varchar("availability", { length: 32 }).$type<"offline" | "available" | "busy">()
      .default("offline")
      .notNull(),
    locationConsentAt: timestamp("locationConsentAt"),
    approvedAt: timestamp("approvedAt"),
    statusReason: varchar("statusReason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userUnique: unique("pediu_courier_profile_user_unique").on(table.userId),
    statusAvailabilityIdx: index("pediu_courier_status_availability_idx").on(
      table.status,
      table.availability,
    ),
  }),
).enableRLS();

export const storeCouriers = pgTable(
  "pediu_store_couriers",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    courierUserId: integer("courierUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).$type<"pending" | "active" | "revoked">()
      .default("pending")
      .notNull(),
    invitedBy: integer("invitedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    storeCourierUnique: unique("pediu_store_courier_unique").on(
      table.storeId,
      table.courierUserId,
    ),
    courierStatusIdx: index("pediu_store_courier_status_idx").on(
      table.courierUserId,
      table.status,
    ),
    invitedByIdx: index("pediu_store_courier_invited_by_idx").on(
      table.invitedBy,
    ),
  }),
).enableRLS();

export const deliveryOffers = pgTable(
  "pediu_delivery_offers",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    courierUserId: integer("courierUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).$type<"pending" | "accepted" | "rejected" | "expired" | "cancelled">()
      .default("pending")
      .notNull(),
    etaMinutes: integer("etaMinutes"),
    message: varchar("message", { length: 255 }),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    respondedAt: timestamp("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_delivery_offer_idempotency_unique").on(
      table.idempotencyKey,
    ),
    courierStatusIdx: index("pediu_delivery_offer_courier_status_idx").on(
      table.courierUserId,
      table.status,
      table.expiresAt,
    ),
    storeIdx: index("pediu_delivery_offer_store_idx").on(table.storeId),
    orderStatusIdx: index("pediu_delivery_offer_order_status_idx").on(
      table.orderId,
      table.status,
    ),
  }),
).enableRLS();

export const deliveryLocations = pgTable(
  "pediu_delivery_locations",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignmentId")
      .notNull()
      .references(() => deliveryAssignments.id, { onDelete: "cascade" }),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courierId: integer("courierId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    etaMinutes: integer("etaMinutes"),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_delivery_location_idempotency_unique").on(
      table.idempotencyKey,
    ),
    assignmentCreatedIdx: index(
      "pediu_delivery_location_assignment_created_idx",
    ).on(table.assignmentId, table.createdAt),
    courierIdx: index("pediu_delivery_location_courier_idx").on(
      table.courierId,
    ),
    orderCapturedIdx: index("pediu_delivery_location_order_captured_idx").on(
      table.orderId,
      table.capturedAt,
      table.id,
    ),
  }),
).enableRLS();

export const chatMessages = pgTable(
  "pediu_chat_messages",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").references(() => orders.id, {
      onDelete: "cascade",
    }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    body: varchar("body", { length: 2000 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_chat_message_idempotency_unique").on(
      table.idempotencyKey,
    ),
    userIdx: index("pediu_chat_user_idx").on(table.userId),
    orderCreatedIdx: index("pediu_chat_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const supportTickets = pgTable(
  "pediu_support_tickets",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("orderId").references(() => orders.id, {
      onDelete: "set null",
    }),
    subject: varchar("subject", { length: 160 }).notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 32 }).$type<"open" | "in_progress" | "resolved" | "closed">()
      .default("open")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userCreatedIdx: index("pediu_support_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    orderIdx: index("pediu_support_order_idx").on(table.orderId),
  }),
).enableRLS();

export const supportTicketMessages = pgTable(
  "pediu_support_ticket_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticketId")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    body: varchar("body", { length: 4000 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_support_message_idempotency_unique").on(
      table.idempotencyKey,
    ),
    userIdx: index("pediu_support_message_user_idx").on(table.userId),
    ticketCreatedIdx: index("pediu_support_message_ticket_created_idx").on(
      table.ticketId,
      table.createdAt,
    ),
  }),
).enableRLS();

export const privacyConsents = pgTable(
  "pediu_privacy_consents",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    version: varchar("version", { length: 20 }).notNull(),
    acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  },
  (table) => ({
    consentUnique: unique("pediu_privacy_consent_unique").on(
      table.userId,
      table.kind,
      table.version,
    ),
    userIdx: index("pediu_privacy_consent_user_idx").on(table.userId),
  }),
).enableRLS();

export const adminAuditLogs = pgTable(
  "pediu_admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actorId").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entityType", { length: 40 }).notNull(),
    entityId: integer("entityId"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index("pediu_admin_audit_created_idx").on(table.createdAt),
  }),
).enableRLS();

export const notifications = pgTable(
  "pediu_notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 40 }).default("general").notNull(),
    actionPath: varchar("actionPath", { length: 255 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userReadCreatedIdx: index("pediu_notifications_user_read_created_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  }),
).enableRLS();

export const notificationOutbox = pgTable(
  "pediu_notification_outbox",
  {
    id: serial("id").primaryKey(),
    notificationId: integer("notificationId")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payload: text("payload").notNull(),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    attemptCount: integer("attemptCount").default(0).notNull(),
    availableAt: timestamp("availableAt").defaultNow().notNull(),
    lockedAt: timestamp("lockedAt"),
    lastError: varchar("lastError", { length: 500 }),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    notificationUnique: unique(
      "pediu_notification_outbox_notification_unique",
    ).on(table.notificationId),
    userIdx: index("pediu_notification_outbox_user_idx").on(table.userId),
    pendingIdx: index("pediu_notification_outbox_status_available_idx").on(
      table.status,
      table.availableAt,
      table.id,
    ),
  }),
).enableRLS();

export const rateLimitBuckets = pgTable(
  "pediu_rate_limit_buckets",
  {
    bucketKey: varchar("bucketKey", { length: 255 }).primaryKey(),
    requestCount: integer("requestCount").default(0).notNull(),
    windowStartedAt: timestamp("windowStartedAt").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    expiresIdx: index("pediu_rate_limit_expires_idx").on(table.expiresAt),
  }),
).enableRLS();

export const notificationPreferences = pgTable(
  "pediu_notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderUpdates: integer("orderUpdates").default(1).notNull(),
    supportMessages: integer("supportMessages").default(1).notNull(),
    promotions: integer("promotions").default(1).notNull(),
    pushEnabled: integer("pushEnabled").default(1).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userUnique: unique("pediu_notification_preferences_user_unique").on(
      table.userId,
    ),
  }),
).enableRLS();

export const adCredits = pgTable(
  "pediu_ad_credits",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    balance: integer("balance").default(3).notNull(),
    lifetimeGranted: integer("lifetimeGranted").default(3).notNull(),
    lifetimeUsed: integer("lifetimeUsed").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    storeUnique: unique("pediu_ad_credits_store_unique").on(table.storeId),
  }),
).enableRLS();

export const generatedAds = pgTable(
  "pediu_generated_ads",
  {
    id: serial("id").primaryKey(),
    storeId: integer("storeId")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: integer("productId").references(() => products.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 32 }).$type<"draft" | "published" | "archived">()
      .default("draft")
      .notNull(),
    headline: varchar("headline", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    cta: varchar("cta", { length: 80 }).notNull(),
    offerLabel: varchar("offerLabel", { length: 120 }),
    visualPrompt: text("visualPrompt").notNull(),
    imageKey: varchar("imageKey", { length: 512 }),
    model: varchar("model", { length: 80 }),
    generationCost: integer("generationCost").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    publishedAt: timestamp("publishedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    storeStatusCreatedIdx: index(
      "pediu_generated_ads_store_status_created_idx",
    ).on(table.storeId, table.status, table.createdAt),
    productStatusIdx: index("pediu_generated_ads_product_status_idx").on(
      table.productId,
      table.status,
    ),
  }),
).enableRLS();

export const loyaltyAccounts = pgTable(
  "pediu_loyalty_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: integer("points").default(0).notNull(),
    lifetimePoints: integer("lifetimePoints").default(0).notNull(),
    tier: varchar("tier", { length: 32 }).$type<"bronze" | "prata" | "flash99">()
      .default("bronze")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    userUnique: unique("pediu_loyalty_accounts_user_unique").on(table.userId),
  }),
).enableRLS();

export const loyaltyLedger = pgTable(
  "pediu_loyalty_ledger",
  {
    id: serial("id").primaryKey(),
    accountId: integer("accountId")
      .notNull()
      .references(() => loyaltyAccounts.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("orderId"),
    direction: varchar("direction", { length: 32 }).$type<"credit" | "debit">().notNull(),
    points: integer("points").notNull(),
    reason: varchar("reason", { length: 80 }).notNull(),
    note: varchar("note", { length: 255 }),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: unique("pediu_loyalty_ledger_idempotency_unique").on(
      table.idempotencyKey,
    ),
    userCreatedIdx: index("pediu_loyalty_ledger_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    accountIdx: index("pediu_loyalty_ledger_account_idx").on(table.accountId),
    orderIdx: index("pediu_loyalty_ledger_order_idx").on(table.orderId),
  }),
).enableRLS();

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type EmailVerificationToken =
  typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type CustomerPaymentPreferences =
  typeof customerPaymentPreferences.$inferSelect;
export type InsertCustomerPaymentPreferences =
  typeof customerPaymentPreferences.$inferInsert;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type CommissionRule = typeof commissionRules.$inferSelect;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type FinancialLedgerEntry = typeof financialLedger.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type PaymentReconciliationRun =
  typeof paymentReconciliationRuns.$inferSelect;
export type PaymentReconciliationItem =
  typeof paymentReconciliationItems.$inferSelect;
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
export type CourierProfile = typeof courierProfiles.$inferSelect;
export type InsertCourierProfile = typeof courierProfiles.$inferInsert;
export type StoreCourier = typeof storeCouriers.$inferSelect;
export type InsertStoreCourier = typeof storeCouriers.$inferInsert;
export type DeliveryOffer = typeof deliveryOffers.$inferSelect;
export type InsertDeliveryOffer = typeof deliveryOffers.$inferInsert;
export type DeliveryLocation = typeof deliveryLocations.$inferSelect;
export type InsertDeliveryLocation = typeof deliveryLocations.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage =
  typeof supportTicketMessages.$inferInsert;
export type PrivacyConsent = typeof privacyConsents.$inferSelect;
export type InsertPrivacyConsent = typeof privacyConsents.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type NotificationOutbox = typeof notificationOutbox.$inferSelect;
export type InsertNotificationOutbox = typeof notificationOutbox.$inferInsert;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type InsertRateLimitBucket = typeof rateLimitBuckets.$inferInsert;
export type NotificationPreferences =
  typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences =
  typeof notificationPreferences.$inferInsert;
export type AdCredit = typeof adCredits.$inferSelect;
export type InsertAdCredit = typeof adCredits.$inferInsert;
export type GeneratedAd = typeof generatedAds.$inferSelect;
export type InsertGeneratedAd = typeof generatedAds.$inferInsert;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type InsertLoyaltyAccount = typeof loyaltyAccounts.$inferInsert;
export type LoyaltyLedgerEntry = typeof loyaltyLedger.$inferSelect;
export type InsertLoyaltyLedgerEntry = typeof loyaltyLedger.$inferInsert;
export type TipSettlement = typeof tipSettlements.$inferSelect;
export type InsertTipSettlement = typeof tipSettlements.$inferInsert;
export type OrderShare = typeof orderShares.$inferSelect;
export type InsertOrderShare = typeof orderShares.$inferInsert;
export type OrderShareParticipant = typeof orderShareParticipants.$inferSelect;
export type InsertOrderShareParticipant =
  typeof orderShareParticipants.$inferInsert;
