import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AdCredit, AdminAuditLog, ChatMessage, Coupon, Customer, CustomerAddress, CustomerPaymentPreferences, DeliveryAssignment, DeliveryLocation, GeneratedAd, InsertAdminAuditLog, InsertChatMessage, InsertCustomer, InsertCustomerAddress, InsertDeliveryAssignment, InsertDeliveryEvent, InsertDeliveryLocation, InsertGeneratedAd, InsertLedgerEntry, InsertNotification, InsertOrder, InsertOrderReview, InsertProduct, InsertPushToken, InsertSale, InsertStore, InsertSupportTicketMessage, InsertUser, LedgerEntry, Notification, NotificationPreferences, Order, OrderReview, Payment, Product, PushToken, Sale, Store, SupportTicket, SupportTicketMessage, User, adCredits, adminAuditLogs, chatMessages, coupons, customerAddresses, customerPaymentPreferences, customers, deliveryAssignments, deliveryEvents, deliveryLocations, emailVerificationTokens, generatedAds, ledgerEntries, notificationPreferences, notifications, orderItems, orderReviews, orders, payments, privacyConsents, products, pushTokens, sales, stores, supportTicketMessages, supportTickets, users, webhookEvents } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

function getInsertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number | string } | undefined)?.insertId);
  if (!Number.isInteger(insertId) || insertId <= 0) {
    throw new Error("MySQL insert did not return a valid insertId");
  }
  return insertId;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getUserProfile(userId: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, input: { name?: string; email?: string | null }): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, userId));
  const updated = await getUserProfile(userId);
  if (!updated) throw new Error("User profile not found after update");
  return updated;
}

export async function updateUserTheme(userId: number, themePreference: "classic" | "ocean" | "sunset"): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ themePreference, updatedAt: new Date() }).where(eq(users.id, userId));
  const updated = await getUserProfile(userId);
  if (!updated) throw new Error("User profile not found after theme update");
  return updated;
}

export async function createEmailVerificationToken(input: { userId: number; email: string; tokenHash: string; expiresAt: Date }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailVerificationTokens).where(and(eq(emailVerificationTokens.userId, input.userId), isNull(emailVerificationTokens.verifiedAt)));
  await db.insert(emailVerificationTokens).values(input);
}

export async function confirmEmailVerification(tokenHash: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(emailVerificationTokens).where(and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.verifiedAt), gt(emailVerificationTokens.expiresAt, new Date()))).limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx.update(users).set({ email: token.email, updatedAt: new Date() }).where(eq(users.id, token.userId));
    await tx.update(emailVerificationTokens).set({ verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, token.id));
    return true;
  });
}

export async function getCustomerPaymentPreferences(userId: number): Promise<CustomerPaymentPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select().from(customerPaymentPreferences).where(eq(customerPaymentPreferences.userId, userId)).limit(1);
  if (current[0]) return current[0];
  await db.insert(customerPaymentPreferences).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const created = await db.select().from(customerPaymentPreferences).where(eq(customerPaymentPreferences.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Payment preferences not found after creation");
  return created[0];
}

export async function updateCustomerPaymentPreferences(userId: number, input: Partial<Pick<CustomerPaymentPreferences, "pixEnabled" | "cardEnabled" | "cashEnabled">>): Promise<CustomerPaymentPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getCustomerPaymentPreferences(userId);
  await db.update(customerPaymentPreferences).set({ ...input, updatedAt: new Date() }).where(eq(customerPaymentPreferences.id, current.id));
  const updated = await db.select().from(customerPaymentPreferences).where(eq(customerPaymentPreferences.id, current.id)).limit(1);
  if (!updated[0]) throw new Error("Payment preferences not found after update");
  return updated[0];
}

export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [profile, addresses, customerOrders, userNotifications, consents, tickets, paymentPreferences] = await Promise.all([
    db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId)),
    db.select().from(orders).where(eq(orders.customerId, userId)).orderBy(desc(orders.createdAt)),
    db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)),
    db.select().from(privacyConsents).where(eq(privacyConsents.userId, userId)).orderBy(desc(privacyConsents.acceptedAt)),
    db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt)),
    db.select().from(customerPaymentPreferences).where(eq(customerPaymentPreferences.userId, userId)).limit(1),
  ]);
  if (!profile[0]) throw new Error("User profile not found");
  const paymentPreference: CustomerPaymentPreferences | null = paymentPreferences.length > 0 ? paymentPreferences[0] : null;
  return { exportedAt: new Date().toISOString(), profile: profile[0], addresses, orders: customerOrders, notifications: userNotifications, consents, supportTickets: tickets, paymentPreferences: paymentPreference };
}

export async function createSupportTicket(input: { userId: number; subject: string; body: string; orderId?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supportTickets).values(input);
  return getInsertId(result);
}

export async function getSupportTicket(ticketId: number): Promise<SupportTicket | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  return result[0];
}

export async function listSupportTicketsForUser(userId: number, limit = 50, offset = 0): Promise<SupportTicket[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt), desc(supportTickets.id)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
}

export async function listSupportTicketMessages(ticketId: number, limit = 100, offset = 0): Promise<SupportTicketMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, ticketId)).orderBy(desc(supportTicketMessages.createdAt), desc(supportTicketMessages.id)).limit(Math.min(limit, 200)).offset(Math.max(offset, 0));
}

export async function getSupportTicketMessageByIdempotencyKey(idempotencyKey: string): Promise<SupportTicketMessage | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(supportTicketMessages).where(eq(supportTicketMessages.idempotencyKey, idempotencyKey)).limit(1);
  return result[0];
}

export async function createSupportTicketMessage(input: InsertSupportTicketMessage): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(supportTicketMessages).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey ? await getSupportTicketMessageByIdempotencyKey(input.idempotencyKey) : undefined;
    if (existing) return { id: existing.id, duplicate: true };
    throw error;
  }
}

export async function markSupportTicketMessagesRead(ticketId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(supportTicketMessages).set({ readAt: new Date() }).where(and(eq(supportTicketMessages.ticketId, ticketId), sql`${supportTicketMessages.readAt} IS NULL`));
}

export async function listOrderReviews(orderId: number): Promise<OrderReview[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderReviews).where(eq(orderReviews.orderId, orderId)).orderBy(desc(orderReviews.createdAt)).limit(100);
}

export async function getOrderReviewByIdempotencyKey(idempotencyKey: string): Promise<OrderReview | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orderReviews).where(eq(orderReviews.idempotencyKey, idempotencyKey)).limit(1);
  return result[0];
}

export async function createOrderReview(input: InsertOrderReview): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(orderReviews).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey ? await getOrderReviewByIdempotencyKey(input.idempotencyKey) : undefined;
    if (existing) return { id: existing.id, duplicate: true };
    throw error;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function listAdminUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).limit(limit).offset(offset);
}

export async function listAdminStores(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stores).limit(limit).offset(offset);
}

export async function listAdminOrders(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).limit(limit).offset(offset);
}

export async function listAdminPayments(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).limit(limit).offset(offset);
}

export async function listAdminSupportTickets(limit = 50, offset = 0): Promise<SupportTicket[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)).limit(limit).offset(offset);
}

export async function updateSupportTicketStatus(ticketId: number, status: "open" | "in_progress" | "resolved" | "closed"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select({ id: supportTickets.id, status: supportTickets.status }).from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!current[0]) throw new Error("Support ticket not found");
  if (current[0].status === status) return;
  const result = await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  if (Number((result as { affectedRows?: number }).affectedRows ?? 0) !== 1) throw new Error("Support ticket not found");
}

export async function getCouponByCode(code: string): Promise<Coupon | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  return result[0];
}

export async function listAdminCustomers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).limit(limit).offset(offset);
}

export async function listAdminLedgerEntries(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ledgerEntries).limit(limit).offset(offset);
}

export async function createAdminAuditLog(input: InsertAdminAuditLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminAuditLogs).values(input);
  return getInsertId(result);
}

export async function listAdminAuditLogs(limit = 50, offset = 0): Promise<AdminAuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminAuditLogs).limit(limit).offset(offset);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

type CustomerAddressWrite = Omit<InsertCustomerAddress, "id" | "userId" | "isDefault" | "createdAt" | "updatedAt"> & { isDefault?: boolean };

export async function listCustomerAddresses(userId: number): Promise<CustomerAddress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId)).orderBy(customerAddresses.createdAt).limit(100);
}

export async function getCustomerAddress(userId: number, addressId: number): Promise<CustomerAddress | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(customerAddresses).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`).limit(1);
  return rows[0];
}

export async function createCustomerAddress(userId: number, input: CustomerAddressWrite): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: customerAddresses.id }).from(customerAddresses).where(eq(customerAddresses.userId, userId));
    const isDefault = input.isDefault === true || existing.length === 0;
    if (isDefault) await tx.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.userId, userId));
    const { isDefault: _requestedDefault, ...fields } = input;
    const result = await tx.insert(customerAddresses).values({ ...fields, userId, isDefault: isDefault ? 1 : 0 });
    return getInsertId(result);
  });
}

export async function updateCustomerAddress(userId: number, addressId: number, input: Partial<CustomerAddressWrite>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx.select().from(customerAddresses).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`).limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    const { isDefault, ...fields } = input;
    if (isDefault === true) await tx.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.userId, userId));
    await tx.update(customerAddresses).set({ ...fields, ...(isDefault === undefined ? {} : { isDefault: isDefault ? 1 : 0 }) }).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`);
  });
}

export async function deleteCustomerAddress(userId: number, addressId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx.select().from(customerAddresses).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`).limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    await tx.delete(customerAddresses).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`);
    if (current[0].isDefault === 1) {
      const next = await tx.select({ id: customerAddresses.id }).from(customerAddresses).where(eq(customerAddresses.userId, userId)).limit(1);
      if (next[0]) await tx.update(customerAddresses).set({ isDefault: 1 }).where(eq(customerAddresses.id, next[0].id));
    }
  });
}

export async function setDefaultCustomerAddress(userId: number, addressId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx.select({ id: customerAddresses.id }).from(customerAddresses).where(sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`).limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    await tx.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.userId, userId));
    await tx.update(customerAddresses).set({ isDefault: 1 }).where(eq(customerAddresses.id, addressId));
  });
}

export async function getStoreForOwner(ownerId: number): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function getStoreById(storeId: number): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return result[0];
}

export async function createStore(input: InsertStore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(stores).values(input);
    const storeId = getInsertId(result);
    await tx.update(users).set({ role: "merchant", updatedAt: new Date() }).where(and(eq(users.id, input.ownerId), eq(users.role, "user")));
    return storeId;
  });
}

export type UpdateStoreInput = Partial<Pick<InsertStore, "name" | "phone" | "address" | "pixKey" | "deliveryFee" | "isOpen">>;

export async function updateStoreForOwner(ownerId: number, input: UpdateStoreInput): Promise<Store> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, ownerId)).limit(1);
  if (!current[0]) throw new Error("Loja não encontrada");
  const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as UpdateStoreInput;
  if (!Object.keys(changes).length) return (await getStoreForOwner(ownerId))!;
  await db.update(stores).set(changes).where(and(eq(stores.id, current[0].id), eq(stores.ownerId, ownerId)));
  const updated = await getStoreForOwner(ownerId);
  if (!updated) throw new Error("Loja não encontrada após atualização");
  return updated;
}

export async function getAdCreditsForStore(storeId: number): Promise<AdCredit> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select().from(adCredits).where(eq(adCredits.storeId, storeId)).limit(1);
  if (current[0]) return current[0];
  await db.insert(adCredits).values({ storeId });
  const created = await db.select().from(adCredits).where(eq(adCredits.storeId, storeId)).limit(1);
  if (!created[0]) throw new Error("Ad credits not found after creation");
  return created[0];
}

export async function listGeneratedAdsForStore(storeId: number): Promise<GeneratedAd[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedAds).where(eq(generatedAds.storeId, storeId)).orderBy(desc(generatedAds.updatedAt), desc(generatedAds.id)).limit(100);
}

export async function getGeneratedAdForStore(storeId: number, adId: number): Promise<GeneratedAd | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(generatedAds).where(sql`${generatedAds.id} = ${adId} AND ${generatedAds.storeId} = ${storeId}`).limit(1);
  return rows[0];
}

export async function createGeneratedAdWithCredit(input: InsertGeneratedAd, creditCost = 1): Promise<GeneratedAd> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const creditRows = await tx.select().from(adCredits).where(eq(adCredits.storeId, input.storeId)).limit(1);
    if (!creditRows[0]) {
      await tx.insert(adCredits).values({ storeId: input.storeId });
    }
    const updatedCredit = await tx.update(adCredits).set({
      balance: sql`${adCredits.balance} - ${creditCost}`,
      lifetimeUsed: sql`${adCredits.lifetimeUsed} + ${creditCost}`,
    }).where(sql`${adCredits.storeId} = ${input.storeId} AND ${adCredits.balance} >= ${creditCost}`);
    const affectedRows = Number((updatedCredit as { affectedRows?: number }).affectedRows ?? 0);
    if (affectedRows !== 1) throw new Error("Você ficou sem créditos de criação de anúncio");
    const result = await tx.insert(generatedAds).values({ ...input, generationCost: creditCost });
    const adId = getInsertId(result);
    const rows = await tx.select().from(generatedAds).where(eq(generatedAds.id, adId)).limit(1);
    if (!rows[0]) throw new Error("Anúncio não encontrado após criação");
    return rows[0];
  });
}

export async function publishGeneratedAd(storeId: number, adId: number): Promise<GeneratedAd> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const current = await tx.select().from(generatedAds).where(sql`${generatedAds.id} = ${adId} AND ${generatedAds.storeId} = ${storeId}`).limit(1);
    if (!current[0]) throw new Error("Anúncio não encontrado");
    if (!current[0].productId) throw new Error("O anúncio precisa estar ligado a um produto");
    const product = await tx.select({ id: products.id, available: products.available }).from(products).where(eq(products.id, current[0].productId)).limit(1);
    if (!product[0] || !product[0].available) throw new Error("Publique somente anúncios de produtos disponíveis");
    await tx.update(generatedAds).set({ status: "archived", updatedAt: new Date() }).where(sql`${generatedAds.storeId} = ${storeId} AND ${generatedAds.productId} = ${current[0].productId} AND ${generatedAds.status} = 'published'`);
    await tx.update(generatedAds).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() }).where(sql`${generatedAds.id} = ${adId} AND ${generatedAds.storeId} = ${storeId}`);
    const updated = await tx.select().from(generatedAds).where(eq(generatedAds.id, adId)).limit(1);
    if (!updated[0]) throw new Error("Anúncio não encontrado após publicação");
    return updated[0];
  });
}

export async function archiveGeneratedAd(storeId: number, adId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(generatedAds).set({ status: "archived", updatedAt: new Date() }).where(sql`${generatedAds.id} = ${adId} AND ${generatedAds.storeId} = ${storeId}`);
  const affectedRows = Number((result as { affectedRows?: number }).affectedRows ?? 0);
  if (affectedRows !== 1) throw new Error("Anúncio não encontrado");
}

export type MarketplaceProduct = Product & { storeName: string; deliveryFee: string; adId: number | null; adHeadline: string | null; adDescription: string | null; adOfferLabel: string | null; adImageKey: string | null };

export type MarketplaceSearchInput = {
  category?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
};

export async function searchAvailableProducts(input: MarketplaceSearchInput = {}): Promise<{ items: MarketplaceProduct[]; hasMore: boolean }> {
  const db = await getDb();
  if (!db) return { items: [], hasMore: false };
  const filters = [eq(products.available, 1), eq(stores.isOpen, 1)];
  if (input.category && input.category !== "Tudo") filters.push(eq(products.category, input.category));
  if (input.query?.trim()) {
    const pattern = `%${input.query.trim().toLowerCase()}%`;
    filters.push(sql`(LOWER(${products.name}) LIKE ${pattern} OR LOWER(${products.category}) LIKE ${pattern} OR LOWER(${stores.name}) LIKE ${pattern})`);
  }
  if (input.minPrice !== undefined) filters.push(sql`${products.price} >= ${input.minPrice.toFixed(2)}`);
  if (input.maxPrice !== undefined) filters.push(sql`${products.price} <= ${input.maxPrice.toFixed(2)}`);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const offset = Math.max(input.offset ?? 0, 0);

  const result = await db
    .select({
      id: products.id,
      storeId: products.storeId,
      name: products.name,
      category: products.category,
      description: products.description,
      price: products.price,
      available: products.available,
      createdAt: products.createdAt,
      storeName: stores.name,
      deliveryFee: stores.deliveryFee,
      adId: generatedAds.id,
      adHeadline: generatedAds.headline,
      adDescription: generatedAds.description,
      adOfferLabel: generatedAds.offerLabel,
      adImageKey: generatedAds.imageKey,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .leftJoin(generatedAds, and(eq(generatedAds.productId, products.id), eq(generatedAds.status, "published")))
    .where(and(...filters))
    .orderBy(desc(generatedAds.id), desc(products.createdAt), desc(products.id))
    .limit(limit + 1)
    .offset(offset);

  return { items: result.slice(0, limit), hasMore: result.length > limit };
}

export async function listAvailableProducts(category?: string): Promise<MarketplaceProduct[]> {
  return (await searchAvailableProducts({ category, limit: 50 })).items;
}

export async function listActiveCoupons(limit = 30): Promise<Coupon[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).where(and(eq(coupons.active, 1), or(isNull(coupons.expiresAt), gt(coupons.expiresAt, new Date())))).orderBy(desc(coupons.createdAt)).limit(Math.min(Math.max(limit, 1), 50));
}

export async function createProduct(input: InsertProduct): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(input);
  return getInsertId(result);
}

export async function listProductsForStore(storeId: number): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.storeId, storeId)).orderBy(products.createdAt, products.id).limit(200);
}

export async function updateProductAvailability(productId: number, available: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set({ available: available ? 1 : 0 }).where(eq(products.id, productId));
}

export async function getProductForStore(productId: number, storeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(sql`${products.id} = ${productId} AND ${products.storeId} = ${storeId}`).limit(1);
  return result[0];
}

export async function getAvailableProductForStore(productId: number, storeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(sql`${products.id} = ${productId} AND ${products.storeId} = ${storeId} AND ${products.available} = 1`).limit(1);
  return result[0];
}

export async function getOrderForCustomer(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(sql`${orders.id} = ${orderId} AND ${orders.customerId} = ${userId}`).limit(1);
  return result[0];
}

export async function getOrderByIdempotencyKey(userId: number, idempotencyKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(sql`${orders.customerId} = ${userId} AND ${orders.idempotencyKey} = ${idempotencyKey}`).limit(1);
  return result[0];
}

export async function getOrderForUser(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(sql`${orders.id} = ${orderId} AND (${orders.customerId} = ${userId} OR ${orders.storeId} IN (SELECT id FROM pediu_stores WHERE ownerId = ${userId}))`).limit(1);
  return result[0];
}

export async function listOrdersForStore(storeId: number, limit = 50, offset = 0): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.updatedAt), desc(orders.id)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
}

export async function getCustomerCredit(storeId: number, customerId: number): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`).limit(1);
  return result[0];
}

export async function getCustomerCreditByUser(storeId: number, userId: number): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(sql`${customers.userId} = ${userId} AND ${customers.storeId} = ${storeId}`).limit(1);
  return result[0];
}

export async function updateStoreOpen(storeId: number, isOpen: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stores).set({ isOpen: isOpen ? 1 : 0 }).where(eq(stores.id, storeId));
}

export async function setCustomerCreditLimit(storeId: number, customerId: number, creditLimit: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set({ creditLimit }).where(sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`);
}

export async function blockCustomer(storeId: number, customerId: number, blocked: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set({ status: blocked ? "blocked" : "active" }).where(sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`);
}

export async function createOrder(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string; note?: string }>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(input);
  const orderId = getInsertId(result);
  if (items.length > 0) await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId })));
  return orderId;
}

export async function createOrderWithPayment(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string; note?: string }>, paymentMethod: "pix" | "card" | "cash"): Promise<{ orderId: number; paymentId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) throw new Error("Pedido sem itens");

  return db.transaction(async (tx) => {
    const orderResult = await tx.insert(orders).values(input);
    const orderId = getInsertId(orderResult);
    const itemRows = items.map((item) => ({ ...item, orderId }));
    await tx.insert(orderItems).values(itemRows);
    const paymentResult = await tx.insert(payments).values({ orderId, method: paymentMethod, status: "pending" });
    const paymentId = getInsertId(paymentResult);
    return { orderId, paymentId };
  });
}

export async function createOrderWithFiado(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string; note?: string }>, creditCustomerId: number, storeId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) throw new Error("Pedido sem itens");
  const requested = Number(input.total);
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("Valor de fiado inválido");

  return db.transaction(async (tx) => {
    const customerRows = await tx.select().from(customers).where(sql`${customers.id} = ${creditCustomerId} AND ${customers.storeId} = ${storeId}`).limit(1);
    const customer = customerRows[0];
    if (!customer) throw new Error("Cliente não cadastrado para esta loja");
    if (customer.status !== "active") throw new Error("Cliente bloqueado");

    const limit = Number(customer.creditLimit);
    const balance = Number(customer.balance);
    if (!Number.isFinite(limit) || !Number.isFinite(balance) || balance + requested > limit) {
      throw new Error("Limite de fiado insuficiente");
    }

    const result = await tx.insert(orders).values(input);
    const orderId = getInsertId(result);
    await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId })));

    const newBalance = (balance + requested).toFixed(2);
    await tx.update(customers).set({ balance: newBalance }).where(sql`${customers.id} = ${creditCustomerId} AND ${customers.storeId} = ${storeId}`);
    await tx.insert(ledgerEntries).values({
      storeId, customerId: creditCustomerId, orderId, type: "credit",
      amount: input.total, balanceAfter: newBalance, note: "Compra via Pediu"
    });
    await tx.insert(payments).values({ orderId, method: "fiado", status: "paid" });
    return orderId;
  });
}

export async function listOrdersForCustomer(customerId: number, limit = 50, offset = 0): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.updatedAt), desc(orders.id)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
}

export async function updateOrderStatus(orderId: number, status: Order["status"]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
}

export async function createDeliveryEvent(input: InsertDeliveryEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveryEvents).values(input);
  return getInsertId(result);
}

export async function getDeliveryAssignmentByOrder(orderId: number): Promise<DeliveryAssignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, orderId)).limit(1);
  return result[0];
}

export async function getLatestDeliveryLocation(orderId: number): Promise<DeliveryLocation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deliveryLocations).where(eq(deliveryLocations.orderId, orderId)).orderBy(desc(deliveryLocations.createdAt), desc(deliveryLocations.id)).limit(1);
  return result[0];
}

export async function upsertDeliveryAssignment(input: InsertDeliveryAssignment): Promise<DeliveryAssignment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getDeliveryAssignmentByOrder(input.orderId);
  if (current) {
    const assignmentFields = { ...input };
    delete assignmentFields.id;
    await db.update(deliveryAssignments).set({ ...assignmentFields, updatedAt: new Date() }).where(eq(deliveryAssignments.id, current.id));
    const updated = await getDeliveryAssignmentByOrder(input.orderId);
    if (!updated) throw new Error("Atribuição de entrega não encontrada após atualização");
    return updated;
  }
  const result = await db.insert(deliveryAssignments).values(input);
  const id = getInsertId(result);
  const created = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.id, id)).limit(1);
  if (!created[0]) throw new Error("Atribuição de entrega não encontrada após criação");
  return created[0];
}

export async function recordDeliveryLocation(input: InsertDeliveryLocation): Promise<{ location: DeliveryLocation; assignment: DeliveryAssignment; created: boolean; dispatched: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(deliveryLocations).where(eq(deliveryLocations.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing[0]) {
      const assignments = await tx.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, input.orderId)).limit(1);
      if (!assignments[0]) throw new Error("Atribuição de entrega não encontrada");
      return { location: existing[0], assignment: assignments[0], created: false, dispatched: false };
    }

    let location: DeliveryLocation;
    try {
      const result = await tx.insert(deliveryLocations).values(input);
      const id = getInsertId(result);
      const created = await tx.select().from(deliveryLocations).where(eq(deliveryLocations.id, id)).limit(1);
      if (!created[0]) throw new Error("Posição não encontrada após criação");
      location = created[0];
    } catch (error) {
      const concurrent = await tx.select().from(deliveryLocations).where(eq(deliveryLocations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (!concurrent[0]) throw error;
      const assignments = await tx.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, input.orderId)).limit(1);
      if (!assignments[0]) throw new Error("Atribuição de entrega não encontrada");
      return { location: concurrent[0], assignment: assignments[0], created: false, dispatched: false };
    }

    await tx.update(deliveryAssignments).set({ currentLatitude: input.latitude, currentLongitude: input.longitude, etaMinutes: input.etaMinutes, lastLocationAt: input.createdAt ?? new Date(), status: "in_transit", updatedAt: new Date() }).where(eq(deliveryAssignments.id, input.assignmentId));
    const orderUpdate = await tx.update(orders).set({ status: "A caminho", updatedAt: new Date() }).where(sql`${orders.id} = ${input.orderId} AND ${orders.status} = 'Pronto'`);
    const dispatched = Number((orderUpdate as { affectedRows?: number }).affectedRows ?? 0) === 1;
    if (dispatched) {
      await tx.insert(deliveryEvents).values({ orderId: input.orderId, eventType: "A caminho", latitude: input.latitude, longitude: input.longitude });
    }
    const assignments = await tx.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, input.orderId)).limit(1);
    if (!assignments[0]) throw new Error("Atribuição de entrega não encontrada após atualização");
    return { location, assignment: assignments[0], created: true, dispatched };
  });
}

export async function updateDeliveryAssignmentStatus(orderId: number, status: DeliveryAssignment["status"]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deliveryAssignments).set({ status, updatedAt: new Date() }).where(eq(deliveryAssignments.orderId, orderId));
}

export async function completeDelivery(orderId: number): Promise<{ changed: boolean; status: Order["status"] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx.update(orders).set({ status: "Entregue", updatedAt: new Date() }).where(sql`${orders.id} = ${orderId} AND ${orders.status} = 'A caminho'`);
    const changed = Number((result as { affectedRows?: number }).affectedRows ?? 0) === 1;
    if (changed) {
      await tx.update(deliveryAssignments).set({ status: "delivered", updatedAt: new Date() }).where(eq(deliveryAssignments.orderId, orderId));
      await tx.insert(deliveryEvents).values({ orderId, eventType: "Entregue" });
      return { changed: true, status: "Entregue" as const };
    }
    const current = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (current[0]?.status === "Entregue") return { changed: false, status: "Entregue" as const };
    throw new Error("A entrega não está pronta para ser encerrada");
  });
}

export async function listChatMessages(orderId: number, limit = 100, offset = 0): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.orderId, orderId)).orderBy(chatMessages.createdAt, chatMessages.id).limit(Math.min(limit, 200)).offset(Math.max(offset, 0));
}

export async function getChatMessageByIdempotencyKey(idempotencyKey: string): Promise<ChatMessage | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chatMessages).where(eq(chatMessages.idempotencyKey, idempotencyKey)).limit(1);
  return result[0];
}

export async function createChatMessage(input: InsertChatMessage): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(chatMessages).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey ? await getChatMessageByIdempotencyKey(input.idempotencyKey) : undefined;
    if (existing) return { id: existing.id, duplicate: true };
    throw error;
  }
}

export async function markChatMessagesRead(orderId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chatMessages).set({ readAt: new Date() }).where(sql`${chatMessages.orderId} = ${orderId} AND ${chatMessages.userId} <> ${userId} AND ${chatMessages.readAt} IS NULL`);
}

export async function getPendingPixPaymentForOrder(orderId: number): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(sql`${payments.orderId} = ${orderId} AND ${payments.method} = 'pix' AND ${payments.status} = 'pending'`).limit(1);
  return result[0];
}

export async function getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.transactionId, transactionId)).limit(1);
  return result[0];
}

export async function getPaymentById(paymentId: number): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  return result[0];
}

export async function createPendingPixPayment(orderId: number, pixKey: string, transactionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values({ orderId, method: "pix", status: "pending", pixKey, transactionId });
  return getInsertId(result);
}

export async function createOrderPayment(orderId: number, method: "pix" | "card" | "cash") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values({ orderId, method, status: "pending" });
  return getInsertId(result);
}

export async function getPaymentForUser(paymentId: number, userId: number): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ payment: payments }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(sql`${payments.id} = ${paymentId} AND (${orders.customerId} = ${userId} OR ${orders.storeId} IN (SELECT id FROM pediu_stores WHERE ownerId = ${userId}))`).limit(1);
  return result[0]?.payment;
}

export async function getPaymentForOrder(orderId: number, userId: number): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ payment: payments }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(sql`${payments.orderId} = ${orderId} AND ${orders.customerId} = ${userId}`).limit(1);
  return result[0]?.payment;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
  if (current === next) return true;
  if (current === "pending") return next === "paid" || next === "failed" || next === "cancelled";
  if (current === "failed") return next === "pending";
  return false;
}

export async function updatePaymentStatus(paymentId: number, status: Exclude<PaymentStatus, "cancelled">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
}

export async function applyPaymentWebhook(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  paymentId?: number;
  transactionId?: string;
  status: PaymentStatus;
}): Promise<{ paymentId: number; status: PaymentStatus; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingEvent = await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, input.provider), eq(webhookEvents.providerEventId, input.providerEventId))).limit(1);
  if (existingEvent[0]?.status === "processed") {
    const existingPayment = input.paymentId ? await getPaymentById(input.paymentId) : input.transactionId ? await getPaymentByTransactionId(input.transactionId) : undefined;
    if (!existingPayment) throw new Error("Payment webhook already processed without a resolvable payment");
    return { paymentId: existingPayment.id, status: existingPayment.status, duplicate: true };
  }

  return db.transaction(async (tx) => {
    let event = existingEvent[0];
    if (!event) {
      const result = await tx.insert(webhookEvents).values({ provider: input.provider, providerEventId: input.providerEventId, eventType: input.eventType, status: "received" });
      const eventId = getInsertId(result);
      const rows = await tx.select().from(webhookEvents).where(eq(webhookEvents.id, eventId)).limit(1);
      event = rows[0];
    }
    if (!event) throw new Error("Webhook event was not persisted");

    const paymentRows = await tx.select().from(payments).where(input.paymentId ? eq(payments.id, input.paymentId) : eq(payments.transactionId, input.transactionId ?? "")).limit(1);
    const payment = paymentRows[0];
    if (!payment) {
      await tx.update(webhookEvents).set({ status: "failed" }).where(eq(webhookEvents.id, event.id));
      throw new Error("Payment not found for webhook");
    }
    if (!canTransitionPayment(payment.status, input.status)) {
      await tx.update(webhookEvents).set({ status: "ignored", processedAt: new Date() }).where(eq(webhookEvents.id, event.id));
      return { paymentId: payment.id, status: payment.status, duplicate: false };
    }
    await tx.update(payments).set({ status: input.status, transactionId: input.transactionId ?? payment.transactionId }).where(eq(payments.id, payment.id));
    await tx.update(webhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(webhookEvents.id, event.id));
    return { paymentId: payment.id, status: input.status, duplicate: false };
  });
}

export async function cancelPendingPaymentForOrder(orderId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status: "cancelled" }).where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}

export async function listCustomersForStore(storeId: number): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.storeId, storeId)).orderBy(customers.createdAt, customers.id).limit(200);
}

export async function createCustomer(input: InsertCustomer): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(input);
  return getInsertId(result);
}

export async function listLedgerEntriesForStore(storeId: number): Promise<LedgerEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.storeId, storeId)).orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.id)).limit(200);
}

export async function createLedgerEntry(input: InsertLedgerEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor de lançamento inválido");

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(customers).where(sql`${customers.id} = ${input.customerId} AND ${customers.storeId} = ${input.storeId}`).limit(1);
    const customer = rows[0];
    if (!customer) throw new Error("Cliente não pertence a esta loja");
    if (customer.status !== "active" && input.type !== "payment") throw new Error("Cliente bloqueado");

    const current = Number(customer.balance);
    const newBalance = input.type === "credit" ? current + amount : Math.max(0, current - amount);
    if (input.type === "credit" && newBalance > Number(customer.creditLimit)) throw new Error("Lançamento excede o limite de crédito");

    const result = await tx.insert(ledgerEntries).values({ ...input, balanceAfter: newBalance.toFixed(2) });
    await tx.update(customers).set({ balance: newBalance.toFixed(2) }).where(sql`${customers.id} = ${input.customerId} AND ${customers.storeId} = ${input.storeId}`);
    return getInsertId(result);
  });
}

export async function listSalesForStore(storeId: number): Promise<Sale[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sales).where(eq(sales.storeId, storeId)).orderBy(desc(sales.createdAt), desc(sales.id)).limit(200);
}

export async function createSale(input: InsertSale): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sales).values(input);
  return getInsertId(result);
}

export async function registerPushToken(input: InsertPushToken): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pushTokens).values(input).onDuplicateKeyUpdate({ set: { userId: input.userId, platform: input.platform } });
}

export async function listPushTokensForUser(userId: number): Promise<PushToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function createNotification(input: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(input);
  return getInsertId(result);
}

export async function listNotificationsForUser(userId: number, limit = 50, offset = 0): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
}

export async function markNotificationRead(userId: number, notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ readAt: new Date() }).where(sql`${notifications.id} = ${notificationId} AND ${notifications.userId} = ${userId}`);
}

export async function getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (current[0]) return current[0];
  await db.insert(notificationPreferences).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Notification preferences not found after creation");
  return created[0];
}

export async function updateNotificationPreferences(userId: number, input: Partial<Pick<NotificationPreferences, "orderUpdates" | "supportMessages" | "promotions" | "pushEnabled">>): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getNotificationPreferences(userId);
  await db.update(notificationPreferences).set({ ...input, updatedAt: new Date() }).where(eq(notificationPreferences.id, current.id));
  const updated = await db.select().from(notificationPreferences).where(eq(notificationPreferences.id, current.id)).limit(1);
  if (!updated[0]) throw new Error("Notification preferences not found after update");
  return updated[0];
}
