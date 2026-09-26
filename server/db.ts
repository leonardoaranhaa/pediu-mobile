import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AdminAuditLog,
  ChatMessage,
  CourierProfile,
  Coupon,
  Customer,
  CustomerAddress,
  CustomerPaymentPreferences,
  DeliveryAssignment,
  DeliveryLocation,
  DeliveryOffer,
  InsertAdminAuditLog,
  InsertCourierProfile,
  InsertChatMessage,
  InsertCustomer,
  InsertCustomerAddress,
  InsertDeliveryAssignment,
  InsertDeliveryEvent,
  InsertDeliveryLocation,
  InsertLedgerEntry,
  InsertNotification,
  InsertOrder,
  InsertOrderReview,
  InsertProduct,
  InsertPushToken,
  InsertSale,
  InsertStore,
  InsertSupportTicketMessage,
  InsertUser,
  LedgerEntry,
  Notification,
  NotificationPreferences,
  Order,
  OrderReview,
  Payment,
  Product,
  PushToken,
  Sale,
  Store,
  StoreCourier,
  SupportTicket,
  SupportTicketMessage,
  User,
  adminAuditLogs,
  chatMessages,
  coupons,
  courierProfiles,
  customerAddresses,
  customerPaymentPreferences,
  customers,
  deliveryAssignments,
  deliveryEvents,
  deliveryLocations,
  deliveryOffers,
  emailVerificationTokens,
  ledgerEntries,
  notificationPreferences,
  notifications,
  orderItems,
  orderReviews,
  orders,
  payments,
  privacyConsents,
  products,
  pushTokens,
  sales,
  storeCouriers,
  stores,
  supportTicketMessages,
  supportTickets,
  users,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isUniqueConstraintError } from "./domain/idempotency";

let _db: ReturnType<typeof drizzle> | null = null;

function getInsertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number(
    (header as { insertId?: number | string } | undefined)?.insertId,
  );
  if (!Number.isInteger(insertId) || insertId <= 0) {
    throw new Error("MySQL insert did not return a valid insertId");
  }
  return insertId;
}

function getAffectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number(
    (header as { affectedRows?: number | string } | undefined)?.affectedRows ??
      0,
  );
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

export async function getUserProfile(
  userId: number,
): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  input: { name?: string; email?: string | null },
): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, userId));
  const updated = await getUserProfile(userId);
  if (!updated) throw new Error("User profile not found after update");
  return updated;
}

export async function updateUserTheme(
  userId: number,
  themePreference: "classic" | "ocean" | "sunset",
): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ themePreference, updatedAt: new Date() })
    .where(eq(users.id, userId));
  const updated = await getUserProfile(userId);
  if (!updated) throw new Error("User profile not found after theme update");
  return updated;
}

export async function createEmailVerificationToken(input: {
  userId: number;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, input.userId),
        isNull(emailVerificationTokens.verifiedAt),
      ),
    );
  await db.insert(emailVerificationTokens).values(input);
}

export async function confirmEmailVerification(
  tokenHash: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.verifiedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx
      .update(users)
      .set({ email: token.email, updatedAt: new Date() })
      .where(eq(users.id, token.userId));
    await tx
      .update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, token.id));
    return true;
  });
}

export async function getCustomerPaymentPreferences(
  userId: number,
): Promise<CustomerPaymentPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db
    .select()
    .from(customerPaymentPreferences)
    .where(eq(customerPaymentPreferences.userId, userId))
    .limit(1);
  if (current[0]) return current[0];
  await db
    .insert(customerPaymentPreferences)
    .values({ userId })
    .onDuplicateKeyUpdate({ set: { userId } });
  const created = await db
    .select()
    .from(customerPaymentPreferences)
    .where(eq(customerPaymentPreferences.userId, userId))
    .limit(1);
  if (!created[0])
    throw new Error("Payment preferences not found after creation");
  return created[0];
}

export async function updateCustomerPaymentPreferences(
  userId: number,
  input: Partial<
    Pick<
      CustomerPaymentPreferences,
      "pixEnabled" | "cardEnabled" | "cashEnabled"
    >
  >,
): Promise<CustomerPaymentPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getCustomerPaymentPreferences(userId);
  await db
    .update(customerPaymentPreferences)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customerPaymentPreferences.id, current.id));
  const updated = await db
    .select()
    .from(customerPaymentPreferences)
    .where(eq(customerPaymentPreferences.id, current.id))
    .limit(1);
  if (!updated[0])
    throw new Error("Payment preferences not found after update");
  return updated[0];
}

export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [
    profile,
    addresses,
    customerOrders,
    userNotifications,
    consents,
    tickets,
    paymentPreferences,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.userId, userId)),
    db
      .select()
      .from(orders)
      .where(eq(orders.customerId, userId))
      .orderBy(desc(orders.createdAt)),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt)),
    db
      .select()
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, userId))
      .orderBy(desc(privacyConsents.acceptedAt)),
    db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt)),
    db
      .select()
      .from(customerPaymentPreferences)
      .where(eq(customerPaymentPreferences.userId, userId))
      .limit(1),
  ]);
  if (!profile[0]) throw new Error("User profile not found");
  const paymentPreference: CustomerPaymentPreferences | null =
    paymentPreferences.length > 0 ? paymentPreferences[0] : null;
  return {
    exportedAt: new Date().toISOString(),
    profile: profile[0],
    addresses,
    orders: customerOrders,
    notifications: userNotifications,
    consents,
    supportTickets: tickets,
    paymentPreferences: paymentPreference,
  };
}

export async function createSupportTicket(input: {
  userId: number;
  subject: string;
  body: string;
  orderId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supportTickets).values(input);
  return getInsertId(result);
}

export async function getSupportTicket(
  ticketId: number,
): Promise<SupportTicket | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  return result[0];
}

export async function listSupportTicketsForUser(
  userId: number,
  limit = 50,
  offset = 0,
): Promise<SupportTicket[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt), desc(supportTickets.id))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}

export async function listSupportTicketMessages(
  ticketId: number,
  limit = 100,
  offset = 0,
): Promise<SupportTicketMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(
      desc(supportTicketMessages.createdAt),
      desc(supportTicketMessages.id),
    )
    .limit(Math.min(limit, 200))
    .offset(Math.max(offset, 0));
}

export async function getSupportTicketMessageByIdempotencyKey(
  idempotencyKey: string,
): Promise<SupportTicketMessage | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.idempotencyKey, idempotencyKey))
    .limit(1);
  return result[0];
}

export async function createSupportTicketMessage(
  input: InsertSupportTicketMessage,
): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(supportTicketMessages).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey
      ? await getSupportTicketMessageByIdempotencyKey(input.idempotencyKey)
      : undefined;
    if (existing) return { id: existing.id, duplicate: true };
    throw error;
  }
}

export async function markSupportTicketMessagesRead(
  ticketId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(supportTicketMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(supportTicketMessages.ticketId, ticketId),
        sql`${supportTicketMessages.readAt} IS NULL`,
      ),
    );
}

export async function listOrderReviews(
  orderId: number,
): Promise<OrderReview[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orderReviews)
    .where(eq(orderReviews.orderId, orderId))
    .orderBy(desc(orderReviews.createdAt))
    .limit(100);
}

export async function getOrderReviewByIdempotencyKey(
  idempotencyKey: string,
): Promise<OrderReview | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orderReviews)
    .where(eq(orderReviews.idempotencyKey, idempotencyKey))
    .limit(1);
  return result[0];
}

export async function createOrderReview(
  input: InsertOrderReview,
): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(orderReviews).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey
      ? await getOrderReviewByIdempotencyKey(input.idempotencyKey)
      : undefined;
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
    if (Object.keys(updateSet).length === 0)
      updateSet.lastSignedIn = new Date();

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function listAdminUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .limit(limit)
    .offset(offset);
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

export async function listAdminSupportTickets(
  limit = 50,
  offset = 0,
): Promise<SupportTicket[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function updateSupportTicketStatus(
  ticketId: number,
  status: "open" | "in_progress" | "resolved" | "closed",
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db
    .select({ id: supportTickets.id, status: supportTickets.status })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!current[0]) throw new Error("Support ticket not found");
  if (current[0].status === status) return;
  const result = await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
  if (getAffectedRows(result) !== 1)
    throw new Error("Support ticket not found");
}

export async function getCouponByCode(
  code: string,
): Promise<Coupon | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  const result = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalized))
    .limit(1);
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

export async function createAdminAuditLog(
  input: InsertAdminAuditLog,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminAuditLogs).values(input);
  return getInsertId(result);
}

export async function listAdminAuditLogs(
  limit = 50,
  offset = 0,
): Promise<AdminAuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminAuditLogs).limit(limit).offset(offset);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCourierProfileByUser(
  userId: number,
): Promise<CourierProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertCourierProfile(
  input: Omit<
    InsertCourierProfile,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "status"
    | "approvedAt"
    | "statusReason"
    | "availability"
  > & { userId: number },
): Promise<CourierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(courierProfiles)
      .where(eq(courierProfiles.userId, input.userId))
      .limit(1);
    if (existing[0]) {
      const status =
        existing[0].status === "approved" &&
        existing[0].vehicleType === input.vehicleType &&
        existing[0].vehiclePlate === (input.vehiclePlate ?? null)
          ? "approved"
          : "pending";
      await tx
        .update(courierProfiles)
        .set({
          ...input,
          status,
          updatedAt: new Date(),
          ...(status === "pending"
            ? { approvedAt: null, statusReason: null }
            : {}),
        })
        .where(eq(courierProfiles.id, existing[0].id));
      const updated = await tx
        .select()
        .from(courierProfiles)
        .where(eq(courierProfiles.id, existing[0].id))
        .limit(1);
      if (!updated[0])
        throw new Error("Perfil de entregador não encontrado após atualização");
      return updated[0];
    }
    const result = await tx
      .insert(courierProfiles)
      .values({ ...input, status: "pending", availability: "offline" });
    const profileId = getInsertId(result);
    const created = await tx
      .select()
      .from(courierProfiles)
      .where(eq(courierProfiles.id, profileId))
      .limit(1);
    if (!created[0])
      throw new Error("Perfil de entregador não encontrado após criação");
    return created[0];
  });
}

export async function setCourierLocationConsent(
  userId: number,
  accepted: boolean,
): Promise<CourierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const profile = await getCourierProfileByUser(userId);
  if (!profile)
    throw new Error(
      "Cadastre o perfil de entregador antes de habilitar a localização",
    );
  await db
    .update(courierProfiles)
    .set({
      locationConsentAt: accepted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(courierProfiles.id, profile.id));
  const updated = await getCourierProfileByUser(userId);
  if (!updated)
    throw new Error("Perfil de entregador não encontrado após atualização");
  return updated;
}

export async function setCourierAvailability(
  userId: number,
  availability: CourierProfile["availability"],
): Promise<CourierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const profile = await getCourierProfileByUser(userId);
  if (!profile) throw new Error("Perfil de entregador não encontrado");
  if (availability === "available" && profile.status !== "approved")
    throw new Error("O perfil precisa ser aprovado antes de ficar disponível");
  await db
    .update(courierProfiles)
    .set({ availability, updatedAt: new Date() })
    .where(eq(courierProfiles.id, profile.id));
  const updated = await getCourierProfileByUser(userId);
  if (!updated)
    throw new Error("Perfil de entregador não encontrado após atualização");
  return updated;
}

export async function listAdminCourierProfiles(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      profile: courierProfiles,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(courierProfiles)
    .innerJoin(users, eq(users.id, courierProfiles.userId))
    .orderBy(desc(courierProfiles.createdAt))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}

export async function reviewCourierProfile(
  profileId: number,
  status: CourierProfile["status"],
  reason?: string,
): Promise<CourierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(courierProfiles)
      .where(eq(courierProfiles.id, profileId))
      .limit(1);
    if (!current[0]) throw new Error("Perfil de entregador não encontrado");
    await tx
      .update(courierProfiles)
      .set({
        status,
        statusReason: reason || null,
        approvedAt: status === "approved" ? new Date() : null,
        availability:
          status === "approved" ? current[0].availability : "offline",
        updatedAt: new Date(),
      })
      .where(eq(courierProfiles.id, profileId));
    if (status === "approved")
      await tx
        .update(users)
        .set({ role: "courier", updatedAt: new Date() })
        .where(and(eq(users.id, current[0].userId), eq(users.role, "user")));
    const updated = await tx
      .select()
      .from(courierProfiles)
      .where(eq(courierProfiles.id, profileId))
      .limit(1);
    if (!updated[0])
      throw new Error("Perfil de entregador não encontrado após revisão");
    return updated[0];
  });
}

type CustomerAddressWrite = Omit<
  InsertCustomerAddress,
  "id" | "userId" | "isDefault" | "createdAt" | "updatedAt"
> & { isDefault?: boolean };

export async function listCustomerAddresses(
  userId: number,
): Promise<CustomerAddress[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.userId, userId))
    .orderBy(customerAddresses.createdAt)
    .limit(100);
}

export async function getCustomerAddress(
  userId: number,
  addressId: number,
): Promise<CustomerAddress | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(customerAddresses)
    .where(
      sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
    )
    .limit(1);
  return rows[0];
}

export async function createCustomerAddress(
  userId: number,
  input: CustomerAddressWrite,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(eq(customerAddresses.userId, userId));
    const isDefault = input.isDefault === true || existing.length === 0;
    if (isDefault)
      await tx
        .update(customerAddresses)
        .set({ isDefault: 0 })
        .where(eq(customerAddresses.userId, userId));
    const { isDefault: _requestedDefault, ...fields } = input;
    const result = await tx
      .insert(customerAddresses)
      .values({ ...fields, userId, isDefault: isDefault ? 1 : 0 });
    return getInsertId(result);
  });
}

export async function updateCustomerAddress(
  userId: number,
  addressId: number,
  input: Partial<CustomerAddressWrite>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(customerAddresses)
      .where(
        sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
      )
      .limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    const { isDefault, ...fields } = input;
    if (isDefault === true)
      await tx
        .update(customerAddresses)
        .set({ isDefault: 0 })
        .where(eq(customerAddresses.userId, userId));
    await tx
      .update(customerAddresses)
      .set({
        ...fields,
        ...(isDefault === undefined ? {} : { isDefault: isDefault ? 1 : 0 }),
      })
      .where(
        sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
      );
  });
}

export async function deleteCustomerAddress(
  userId: number,
  addressId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(customerAddresses)
      .where(
        sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
      )
      .limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    await tx
      .delete(customerAddresses)
      .where(
        sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
      );
    if (current[0].isDefault === 1) {
      const next = await tx
        .select({ id: customerAddresses.id })
        .from(customerAddresses)
        .where(eq(customerAddresses.userId, userId))
        .limit(1);
      if (next[0])
        await tx
          .update(customerAddresses)
          .set({ isDefault: 1 })
          .where(eq(customerAddresses.id, next[0].id));
    }
  });
}

export async function setDefaultCustomerAddress(
  userId: number,
  addressId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(
        sql`${customerAddresses.id} = ${addressId} AND ${customerAddresses.userId} = ${userId}`,
      )
      .limit(1);
    if (!current[0]) throw new Error("Endereço não encontrado");
    await tx
      .update(customerAddresses)
      .set({ isDefault: 0 })
      .where(eq(customerAddresses.userId, userId));
    await tx
      .update(customerAddresses)
      .set({ isDefault: 1 })
      .where(eq(customerAddresses.id, addressId));
  });
}

export async function getStoreForOwner(
  ownerId: number,
): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, ownerId))
    .limit(1);
  return result[0];
}

export async function getStoreById(
  storeId: number,
): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return result[0];
}

export async function createStore(input: InsertStore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(stores).values(input);
    const storeId = getInsertId(result);
    await tx
      .update(users)
      .set({ role: "merchant", updatedAt: new Date() })
      .where(and(eq(users.id, input.ownerId), eq(users.role, "user")));
    return storeId;
  });
}

export type UpdateStoreInput = Partial<
  Pick<
    InsertStore,
    "name" | "phone" | "address" | "pixKey" | "deliveryFee" | "isOpen"
  >
>;

export async function updateStoreForOwner(
  ownerId: number,
  input: UpdateStoreInput,
): Promise<Store> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.ownerId, ownerId))
    .limit(1);
  if (!current[0]) throw new Error("Loja não encontrada");
  const changes = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as UpdateStoreInput;
  if (!Object.keys(changes).length) return (await getStoreForOwner(ownerId))!;
  await db
    .update(stores)
    .set(changes)
    .where(and(eq(stores.id, current[0].id), eq(stores.ownerId, ownerId)));
  const updated = await getStoreForOwner(ownerId);
  if (!updated) throw new Error("Loja não encontrada após atualização");
  return updated;
}

export async function linkCourierToStore(
  ownerId: number,
  courierUserId: number,
): Promise<StoreCourier> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const store = await getStoreForOwner(ownerId);
  if (!store) throw new Error("Loja não encontrada");
  const profile = await getCourierProfileByUser(courierUserId);
  if (!profile || profile.status !== "approved")
    throw new Error("O entregador precisa estar aprovado antes do vínculo");
  const existing = await db
    .select()
    .from(storeCouriers)
    .where(
      sql`${storeCouriers.storeId} = ${store.id} AND ${storeCouriers.courierUserId} = ${courierUserId}`,
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(storeCouriers)
      .set({ status: "active", invitedBy: ownerId, updatedAt: new Date() })
      .where(eq(storeCouriers.id, existing[0].id));
    const updated = await db
      .select()
      .from(storeCouriers)
      .where(eq(storeCouriers.id, existing[0].id))
      .limit(1);
    if (!updated[0]) throw new Error("Vínculo não encontrado após atualização");
    return updated[0];
  }
  const result = await db.insert(storeCouriers).values({
    storeId: store.id,
    courierUserId,
    status: "active",
    invitedBy: ownerId,
  });
  const id = getInsertId(result);
  const created = await db
    .select()
    .from(storeCouriers)
    .where(eq(storeCouriers.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Vínculo não encontrado após criação");
  return created[0];
}

export async function listCouriersForStore(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const store = await getStoreForOwner(ownerId);
  if (!store) return [];
  return db
    .select({
      id: storeCouriers.id,
      courierUserId: storeCouriers.courierUserId,
      linkStatus: storeCouriers.status,
      profileStatus: courierProfiles.status,
      availability: courierProfiles.availability,
      vehicleType: courierProfiles.vehicleType,
      name: users.name,
      email: users.email,
      phone: courierProfiles.phone,
    })
    .from(storeCouriers)
    .innerJoin(
      courierProfiles,
      eq(courierProfiles.userId, storeCouriers.courierUserId),
    )
    .innerJoin(users, eq(users.id, storeCouriers.courierUserId))
    .where(eq(storeCouriers.storeId, store.id))
    .orderBy(desc(storeCouriers.updatedAt))
    .limit(100);
}

export type MarketplaceProduct = Product & {
  storeName: string;
  deliveryFee: string;
};

export type MarketplaceSearchInput = {
  category?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
};

export async function searchAvailableProducts(
  input: MarketplaceSearchInput = {},
): Promise<{ items: MarketplaceProduct[]; hasMore: boolean }> {
  const db = await getDb();
  if (!db) return { items: [], hasMore: false };
  const filters = [eq(products.available, 1), eq(stores.isOpen, 1)];
  if (input.category && input.category !== "Tudo")
    filters.push(eq(products.category, input.category));
  if (input.query?.trim()) {
    const pattern = `%${input.query.trim().toLowerCase()}%`;
    filters.push(
      sql`(LOWER(${products.name}) LIKE ${pattern} OR LOWER(${products.category}) LIKE ${pattern} OR LOWER(${stores.name}) LIKE ${pattern})`,
    );
  }
  if (input.minPrice !== undefined)
    filters.push(sql`${products.price} >= ${input.minPrice.toFixed(2)}`);
  if (input.maxPrice !== undefined)
    filters.push(sql`${products.price} <= ${input.maxPrice.toFixed(2)}`);
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
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(and(...filters))
    .orderBy(products.createdAt, products.id)
    .limit(limit + 1)
    .offset(offset);

  return { items: result.slice(0, limit), hasMore: result.length > limit };
}

export async function listAvailableProducts(
  category?: string,
): Promise<MarketplaceProduct[]> {
  return (await searchAvailableProducts({ category, limit: 50 })).items;
}

export async function createProduct(input: InsertProduct): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(input);
  return getInsertId(result);
}

export async function listProductsForStore(
  storeId: number,
): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(products.createdAt, products.id)
    .limit(200);
}

export async function updateProductAvailability(
  productId: number,
  available: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(products)
    .set({ available: available ? 1 : 0 })
    .where(eq(products.id, productId));
}

export async function getProductForStore(productId: number, storeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(products)
    .where(
      sql`${products.id} = ${productId} AND ${products.storeId} = ${storeId}`,
    )
    .limit(1);
  return result[0];
}

export async function getAvailableProductForStore(
  productId: number,
  storeId: number,
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(products)
    .where(
      sql`${products.id} = ${productId} AND ${products.storeId} = ${storeId} AND ${products.available} = 1`,
    )
    .limit(1);
  return result[0];
}

export async function getOrderForCustomer(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(sql`${orders.id} = ${orderId} AND ${orders.customerId} = ${userId}`)
    .limit(1);
  return result[0];
}

export async function getOrderByIdempotencyKey(
  userId: number,
  idempotencyKey: string,
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(
      sql`${orders.customerId} = ${userId} AND ${orders.idempotencyKey} = ${idempotencyKey}`,
    )
    .limit(1);
  return result[0];
}

export async function getOrderForUser(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(
      sql`${orders.id} = ${orderId} AND (${orders.customerId} = ${userId} OR ${orders.storeId} IN (SELECT id FROM pediu_stores WHERE ownerId = ${userId}) OR ${orders.id} IN (SELECT orderId FROM pediu_delivery_assignments WHERE courierId = ${userId}))`,
    )
    .limit(1);
  return result[0];
}

export async function listOrdersForStore(
  storeId: number,
  limit = 50,
  offset = 0,
): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.storeId, storeId))
    .orderBy(desc(orders.updatedAt), desc(orders.id))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}

export async function getCustomerCredit(
  storeId: number,
  customerId: number,
): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(customers)
    .where(
      sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`,
    )
    .limit(1);
  return result[0];
}

export async function getCustomerCreditByUser(
  storeId: number,
  userId: number,
): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(customers)
    .where(
      sql`${customers.userId} = ${userId} AND ${customers.storeId} = ${storeId}`,
    )
    .limit(1);
  return result[0];
}

export async function updateStoreOpen(
  storeId: number,
  isOpen: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(stores)
    .set({ isOpen: isOpen ? 1 : 0 })
    .where(eq(stores.id, storeId));
}

export async function setCustomerCreditLimit(
  storeId: number,
  customerId: number,
  creditLimit: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(customers)
    .set({ creditLimit })
    .where(
      sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`,
    );
}

export async function blockCustomer(
  storeId: number,
  customerId: number,
  blocked: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(customers)
    .set({ status: blocked ? "blocked" : "active" })
    .where(
      sql`${customers.id} = ${customerId} AND ${customers.storeId} = ${storeId}`,
    );
}

export async function createOrder(
  input: InsertOrder,
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: string;
    note?: string;
  }>,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(input);
  const orderId = getInsertId(result);
  if (items.length > 0)
    await db
      .insert(orderItems)
      .values(items.map((item) => ({ ...item, orderId })));
  return orderId;
}

export async function createOrderWithPayment(
  input: InsertOrder,
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: string;
    note?: string;
  }>,
  paymentMethod: "pix" | "card" | "cash",
): Promise<{ orderId: number; paymentId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) throw new Error("Pedido sem itens");

  return db.transaction(async (tx) => {
    const orderResult = await tx.insert(orders).values(input);
    const orderId = getInsertId(orderResult);
    const itemRows = items.map((item) => ({ ...item, orderId }));
    await tx.insert(orderItems).values(itemRows);
    const paymentResult = await tx
      .insert(payments)
      .values({ orderId, method: paymentMethod, status: "pending" });
    const paymentId = getInsertId(paymentResult);
    return { orderId, paymentId };
  });
}

export async function createOrderWithFiado(
  input: InsertOrder,
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: string;
    note?: string;
  }>,
  creditCustomerId: number,
  storeId: number,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) throw new Error("Pedido sem itens");
  const requested = Number(input.total);
  if (!Number.isFinite(requested) || requested <= 0)
    throw new Error("Valor de fiado inválido");

  return db.transaction(async (tx) => {
    const customerRows = await tx
      .select()
      .from(customers)
      .where(
        sql`${customers.id} = ${creditCustomerId} AND ${customers.storeId} = ${storeId}`,
      )
      .limit(1);
    const customer = customerRows[0];
    if (!customer) throw new Error("Cliente não cadastrado para esta loja");
    if (customer.status !== "active") throw new Error("Cliente bloqueado");

    const limit = Number(customer.creditLimit);
    const balance = Number(customer.balance);
    if (
      !Number.isFinite(limit) ||
      !Number.isFinite(balance) ||
      balance + requested > limit
    ) {
      throw new Error("Limite de fiado insuficiente");
    }

    const result = await tx.insert(orders).values(input);
    const orderId = getInsertId(result);
    await tx
      .insert(orderItems)
      .values(items.map((item) => ({ ...item, orderId })));

    const newBalance = (balance + requested).toFixed(2);
    await tx
      .update(customers)
      .set({ balance: newBalance })
      .where(
        sql`${customers.id} = ${creditCustomerId} AND ${customers.storeId} = ${storeId}`,
      );
    await tx.insert(ledgerEntries).values({
      storeId,
      customerId: creditCustomerId,
      orderId,
      type: "credit",
      amount: input.total,
      balanceAfter: newBalance,
      note: "Compra via Pediu",
    });
    await tx
      .insert(payments)
      .values({ orderId, method: "fiado", status: "paid" });
    return orderId;
  });
}

export async function listOrdersForCustomer(
  customerId: number,
  limit = 50,
  offset = 0,
): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.updatedAt), desc(orders.id))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}

export async function updateOrderStatus(
  orderId: number,
  status: Order["status"],
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
}

export async function createDeliveryEvent(
  input: InsertDeliveryEvent,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveryEvents).values(input);
  return getInsertId(result);
}

export async function getDeliveryAssignmentByOrder(
  orderId: number,
): Promise<DeliveryAssignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(deliveryAssignments)
    .where(eq(deliveryAssignments.orderId, orderId))
    .limit(1);
  return result[0];
}

export async function getLatestDeliveryLocation(
  orderId: number,
): Promise<DeliveryLocation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(deliveryLocations)
    .where(eq(deliveryLocations.orderId, orderId))
    .orderBy(desc(deliveryLocations.createdAt), desc(deliveryLocations.id))
    .limit(1);
  return result[0];
}

export async function upsertDeliveryAssignment(
  input: InsertDeliveryAssignment,
): Promise<DeliveryAssignment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getDeliveryAssignmentByOrder(input.orderId);
  if (current) {
    const assignmentFields = { ...input };
    delete assignmentFields.id;
    await db
      .update(deliveryAssignments)
      .set({ ...assignmentFields, updatedAt: new Date() })
      .where(eq(deliveryAssignments.id, current.id));
    const updated = await getDeliveryAssignmentByOrder(input.orderId);
    if (!updated)
      throw new Error("Atribuição de entrega não encontrada após atualização");
    return updated;
  }
  const result = await db.insert(deliveryAssignments).values(input);
  const id = getInsertId(result);
  const created = await db
    .select()
    .from(deliveryAssignments)
    .where(eq(deliveryAssignments.id, id))
    .limit(1);
  if (!created[0])
    throw new Error("Atribuição de entrega não encontrada após criação");
  return created[0];
}

export async function recordDeliveryLocation(
  input: InsertDeliveryLocation,
): Promise<{
  location: DeliveryLocation;
  assignment: DeliveryAssignment;
  created: boolean;
  dispatched: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(deliveryLocations)
      .where(eq(deliveryLocations.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing[0]) {
      const assignments = await tx
        .select()
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.orderId, input.orderId))
        .limit(1);
      if (!assignments[0])
        throw new Error("Atribuição de entrega não encontrada");
      return {
        location: existing[0],
        assignment: assignments[0],
        created: false,
        dispatched: false,
      };
    }

    let location: DeliveryLocation;
    try {
      const result = await tx.insert(deliveryLocations).values(input);
      const id = getInsertId(result);
      const created = await tx
        .select()
        .from(deliveryLocations)
        .where(eq(deliveryLocations.id, id))
        .limit(1);
      if (!created[0]) throw new Error("Posição não encontrada após criação");
      location = created[0];
    } catch (error) {
      const concurrent = await tx
        .select()
        .from(deliveryLocations)
        .where(eq(deliveryLocations.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (!concurrent[0]) throw error;
      const assignments = await tx
        .select()
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.orderId, input.orderId))
        .limit(1);
      if (!assignments[0])
        throw new Error("Atribuição de entrega não encontrada");
      return {
        location: concurrent[0],
        assignment: assignments[0],
        created: false,
        dispatched: false,
      };
    }

    await tx
      .update(deliveryAssignments)
      .set({
        currentLatitude: input.latitude,
        currentLongitude: input.longitude,
        etaMinutes: input.etaMinutes,
        lastLocationAt: input.createdAt ?? new Date(),
        status: "in_transit",
        updatedAt: new Date(),
      })
      .where(eq(deliveryAssignments.id, input.assignmentId));
    const orderUpdate = await tx
      .update(orders)
      .set({ status: "A caminho", updatedAt: new Date() })
      .where(
        sql`${orders.id} = ${input.orderId} AND ${orders.status} = 'Pronto'`,
      );
    const dispatched = getAffectedRows(orderUpdate) === 1;
    if (dispatched) {
      await tx.insert(deliveryEvents).values({
        orderId: input.orderId,
        eventType: "A caminho",
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }
    const assignments = await tx
      .select()
      .from(deliveryAssignments)
      .where(eq(deliveryAssignments.orderId, input.orderId))
      .limit(1);
    if (!assignments[0])
      throw new Error("Atribuição de entrega não encontrada após atualização");
    return { location, assignment: assignments[0], created: true, dispatched };
  });
}

export async function updateDeliveryAssignmentStatus(
  orderId: number,
  status: DeliveryAssignment["status"],
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(deliveryAssignments)
    .set({ status, updatedAt: new Date() })
    .where(eq(deliveryAssignments.orderId, orderId));
}

export async function completeDelivery(
  orderId: number,
): Promise<{ changed: boolean; status: Order["status"] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx
      .update(orders)
      .set({ status: "Entregue", updatedAt: new Date() })
      .where(sql`${orders.id} = ${orderId} AND ${orders.status} = 'A caminho'`);
    const changed = getAffectedRows(result) === 1;
    if (changed) {
      await tx
        .update(deliveryAssignments)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(deliveryAssignments.orderId, orderId));
      await tx
        .insert(deliveryEvents)
        .values({ orderId, eventType: "Entregue" });
      return { changed: true, status: "Entregue" as const };
    }
    const current = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (current[0]?.status === "Entregue")
      return { changed: false, status: "Entregue" as const };
    throw new Error("A entrega não está pronta para ser encerrada");
  });
}

export async function createDeliveryOffer(input: {
  ownerId: number;
  orderId: number;
  courierUserId: number;
  etaMinutes?: number;
  message?: string;
  idempotencyKey: string;
  expiresAt: Date;
}): Promise<DeliveryOffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const store = (
      await tx
        .select()
        .from(stores)
        .where(eq(stores.ownerId, input.ownerId))
        .limit(1)
    )[0];
    if (!store) throw new Error("Loja não encontrada");
    const order = (
      await tx
        .select()
        .from(orders)
        .where(
          sql`${orders.id} = ${input.orderId} AND ${orders.storeId} = ${store.id}`,
        )
        .limit(1)
    )[0];
    if (!order || order.status !== "Pronto")
      throw new Error("O pedido precisa estar pronto para receber uma oferta");
    const profile = (
      await tx
        .select()
        .from(courierProfiles)
        .where(
          and(
            eq(courierProfiles.userId, input.courierUserId),
            eq(courierProfiles.status, "approved"),
          ),
        )
        .limit(1)
    )[0];
    if (!profile || profile.availability !== "available")
      throw new Error("Entregador indisponível ou não aprovado");
    const link = (
      await tx
        .select()
        .from(storeCouriers)
        .where(
          sql`${storeCouriers.storeId} = ${store.id} AND ${storeCouriers.courierUserId} = ${input.courierUserId} AND ${storeCouriers.status} = 'active'`,
        )
        .limit(1)
    )[0];
    if (!link) throw new Error("Entregador não vinculado a esta loja");
    const existing = (
      await tx
        .select()
        .from(deliveryOffers)
        .where(eq(deliveryOffers.idempotencyKey, input.idempotencyKey))
        .limit(1)
    )[0];
    if (existing) return existing;
    const assignment = (
      await tx
        .select({ id: deliveryAssignments.id })
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.orderId, input.orderId))
        .limit(1)
    )[0];
    if (assignment)
      throw new Error("O pedido já possui uma atribuição de entrega");
    const result = await tx.insert(deliveryOffers).values({
      orderId: input.orderId,
      storeId: store.id,
      courierUserId: input.courierUserId,
      etaMinutes: input.etaMinutes,
      message: input.message,
      idempotencyKey: input.idempotencyKey,
      expiresAt: input.expiresAt,
      status: "pending",
    });
    const id = getInsertId(result);
    const created = await tx
      .select()
      .from(deliveryOffers)
      .where(eq(deliveryOffers.id, id))
      .limit(1);
    if (!created[0]) throw new Error("Oferta não encontrada após criação");
    return created[0];
  });
}

export async function listPendingDeliveryOffers(courierUserId: number) {
  const db = await getDb();
  if (!db) return [];
  await db
    .update(deliveryOffers)
    .set({ status: "expired", respondedAt: new Date() })
    .where(
      sql`${deliveryOffers.courierUserId} = ${courierUserId} AND ${deliveryOffers.status} = 'pending' AND ${deliveryOffers.expiresAt} < ${new Date()}`,
    );
  return db
    .select({
      id: deliveryOffers.id,
      orderId: deliveryOffers.orderId,
      storeId: deliveryOffers.storeId,
      status: deliveryOffers.status,
      etaMinutes: deliveryOffers.etaMinutes,
      message: deliveryOffers.message,
      expiresAt: deliveryOffers.expiresAt,
      createdAt: deliveryOffers.createdAt,
      storeName: stores.name,
      deliveryAddress: orders.deliveryAddress,
      total: orders.total,
    })
    .from(deliveryOffers)
    .innerJoin(stores, eq(stores.id, deliveryOffers.storeId))
    .innerJoin(orders, eq(orders.id, deliveryOffers.orderId))
    .where(
      and(
        eq(deliveryOffers.courierUserId, courierUserId),
        eq(deliveryOffers.status, "pending"),
      ),
    )
    .orderBy(desc(deliveryOffers.createdAt))
    .limit(50);
}

export async function respondToDeliveryOffer(input: {
  offerId: number;
  courierUserId: number;
  accept: boolean;
}): Promise<{ offer: DeliveryOffer; assignment?: DeliveryAssignment }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const offer = (
      await tx
        .select()
        .from(deliveryOffers)
        .where(
          sql`${deliveryOffers.id} = ${input.offerId} AND ${deliveryOffers.courierUserId} = ${input.courierUserId}`,
        )
        .limit(1)
    )[0];
    if (!offer) throw new Error("Oferta não encontrada ou não autorizada");
    if (offer.status !== "pending") {
      const assignment = (
        await tx
          .select()
          .from(deliveryAssignments)
          .where(
            sql`${deliveryAssignments.orderId} = ${offer.orderId} AND ${deliveryAssignments.courierId} = ${input.courierUserId}`,
          )
          .limit(1)
      )[0];
      return { offer, assignment };
    }
    if (!input.accept) {
      await tx
        .update(deliveryOffers)
        .set({ status: "rejected", respondedAt: new Date() })
        .where(eq(deliveryOffers.id, offer.id));
      const rejected = (
        await tx
          .select()
          .from(deliveryOffers)
          .where(eq(deliveryOffers.id, offer.id))
          .limit(1)
      )[0];
      if (!rejected) throw new Error("Oferta não encontrada após recusa");
      return { offer: rejected };
    }
    if (offer.expiresAt <= new Date()) throw new Error("Esta oferta expirou");
    const profile = (
      await tx
        .select()
        .from(courierProfiles)
        .where(
          and(
            eq(courierProfiles.userId, input.courierUserId),
            eq(courierProfiles.status, "approved"),
          ),
        )
        .limit(1)
    )[0];
    if (!profile || profile.availability !== "available")
      throw new Error("O entregador está indisponível");
    const order = (
      await tx
        .select()
        .from(orders)
        .where(eq(orders.id, offer.orderId))
        .limit(1)
    )[0];
    if (!order || order.status !== "Pronto")
      throw new Error("O pedido não está mais disponível");
    const existingAssignment = (
      await tx
        .select()
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.orderId, offer.orderId))
        .limit(1)
    )[0];
    if (existingAssignment)
      throw new Error("O pedido já foi aceito por outro entregador");
    const user = (
      await tx
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, input.courierUserId))
        .limit(1)
    )[0];
    const assignmentResult = await tx.insert(deliveryAssignments).values({
      orderId: offer.orderId,
      courierId: input.courierUserId,
      courierName: user?.name?.trim() || "Entregador Pediu",
      courierPhone: profile.phone,
      etaMinutes: offer.etaMinutes,
      status: "assigned",
    });
    const assignmentId = getInsertId(assignmentResult);
    await tx
      .update(deliveryOffers)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(deliveryOffers.id, offer.id));
    await tx
      .update(deliveryOffers)
      .set({ status: "cancelled", respondedAt: new Date() })
      .where(
        and(
          eq(deliveryOffers.orderId, offer.orderId),
          eq(deliveryOffers.status, "pending"),
        ),
      );
    await tx
      .update(courierProfiles)
      .set({ availability: "busy", updatedAt: new Date() })
      .where(eq(courierProfiles.userId, input.courierUserId));
    const accepted = (
      await tx
        .select()
        .from(deliveryOffers)
        .where(eq(deliveryOffers.id, offer.id))
        .limit(1)
    )[0];
    const assignment = (
      await tx
        .select()
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.id, assignmentId))
        .limit(1)
    )[0];
    if (!accepted || !assignment)
      throw new Error("Oferta aceita sem atribuição persistida");
    return { offer: accepted, assignment };
  });
}

export async function listActiveDeliveriesForCourier(courierUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      assignment: deliveryAssignments,
      order: orders,
      store: {
        id: stores.id,
        name: stores.name,
        phone: stores.phone,
        address: stores.address,
      },
    })
    .from(deliveryAssignments)
    .innerJoin(orders, eq(orders.id, deliveryAssignments.orderId))
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(
      and(
        eq(deliveryAssignments.courierId, courierUserId),
        inArray(deliveryAssignments.status, ["assigned", "in_transit"]),
      ),
    )
    .orderBy(desc(deliveryAssignments.updatedAt))
    .limit(20);
}

export async function listChatMessages(
  orderId: number,
  limit = 100,
  offset = 0,
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.orderId, orderId))
    .orderBy(chatMessages.createdAt, chatMessages.id)
    .limit(Math.min(limit, 200))
    .offset(Math.max(offset, 0));
}

export async function getChatMessageByIdempotencyKey(
  idempotencyKey: string,
): Promise<ChatMessage | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.idempotencyKey, idempotencyKey))
    .limit(1);
  return result[0];
}

export async function createChatMessage(
  input: InsertChatMessage,
): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(chatMessages).values(input);
    return { id: getInsertId(result), duplicate: false };
  } catch (error) {
    const existing = input.idempotencyKey
      ? await getChatMessageByIdempotencyKey(input.idempotencyKey)
      : undefined;
    if (existing) return { id: existing.id, duplicate: true };
    throw error;
  }
}

export async function markChatMessagesRead(
  orderId: number,
  userId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(chatMessages)
    .set({ readAt: new Date() })
    .where(
      sql`${chatMessages.orderId} = ${orderId} AND ${chatMessages.userId} <> ${userId} AND ${chatMessages.readAt} IS NULL`,
    );
}

export async function getPendingPixPaymentForOrder(
  orderId: number,
): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(payments)
    .where(
      sql`${payments.orderId} = ${orderId} AND ${payments.method} = 'pix' AND ${payments.status} = 'pending'`,
    )
    .limit(1);
  return result[0];
}

export async function getPaymentByTransactionId(
  transactionId: string,
): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, transactionId))
    .limit(1);
  return result[0];
}

export async function getPaymentById(
  paymentId: number,
): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  return result[0];
}

export async function createPendingPixPayment(
  orderId: number,
  pixKey: string,
  transactionId?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values({
    orderId,
    method: "pix",
    status: "pending",
    pixKey,
    transactionId,
  });
  return getInsertId(result);
}

export async function createOrderPayment(
  orderId: number,
  method: "pix" | "card" | "cash",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(payments)
    .values({ orderId, method, status: "pending" });
  return getInsertId(result);
}

export async function getPaymentForUser(
  paymentId: number,
  userId: number,
): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ payment: payments })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(
      sql`${payments.id} = ${paymentId} AND (${orders.customerId} = ${userId} OR ${orders.storeId} IN (SELECT id FROM pediu_stores WHERE ownerId = ${userId}))`,
    )
    .limit(1);
  return result[0]?.payment;
}

export async function getPaymentForOrder(
  orderId: number,
  userId: number,
): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ payment: payments })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(
      sql`${payments.orderId} = ${orderId} AND ${orders.customerId} = ${userId}`,
    )
    .limit(1);
  return result[0]?.payment;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export function canTransitionPayment(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  if (current === next) return true;
  if (current === "pending")
    return next === "paid" || next === "failed" || next === "cancelled";
  if (current === "failed") return next === "pending";
  return false;
}

export async function updatePaymentStatus(
  paymentId: number,
  status: Exclude<PaymentStatus, "cancelled">,
): Promise<void> {
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

  const existingEvent = await db
    .select()
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, input.provider),
        eq(webhookEvents.providerEventId, input.providerEventId),
      ),
    )
    .limit(1);
  if (existingEvent[0]?.status === "processed") {
    const existingPayment = input.paymentId
      ? await getPaymentById(input.paymentId)
      : input.transactionId
        ? await getPaymentByTransactionId(input.transactionId)
        : undefined;
    if (!existingPayment)
      throw new Error(
        "Payment webhook already processed without a resolvable payment",
      );
    return {
      paymentId: existingPayment.id,
      status: existingPayment.status,
      duplicate: true,
    };
  }

  try {
    return await db.transaction(async (tx) => {
      let event = existingEvent[0];
      if (!event) {
        const result = await tx.insert(webhookEvents).values({
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          status: "received",
        });
        const eventId = getInsertId(result);
        const rows = await tx
          .select()
          .from(webhookEvents)
          .where(eq(webhookEvents.id, eventId))
          .limit(1);
        event = rows[0];
      }
      if (!event) throw new Error("Webhook event was not persisted");

      const paymentRows = await tx
        .select()
        .from(payments)
        .where(
          input.paymentId
            ? eq(payments.id, input.paymentId)
            : eq(payments.transactionId, input.transactionId ?? ""),
        )
        .limit(1);
      const payment = paymentRows[0];
      if (!payment) {
        await tx
          .update(webhookEvents)
          .set({ status: "failed" })
          .where(eq(webhookEvents.id, event.id));
        throw new Error("Payment not found for webhook");
      }
      if (!canTransitionPayment(payment.status, input.status)) {
        await tx
          .update(webhookEvents)
          .set({ status: "ignored", processedAt: new Date() })
          .where(eq(webhookEvents.id, event.id));
        return {
          paymentId: payment.id,
          status: payment.status,
          duplicate: false,
        };
      }
      await tx
        .update(payments)
        .set({
          status: input.status,
          transactionId: input.transactionId ?? payment.transactionId,
        })
        .where(eq(payments.id, payment.id));
      await tx
        .update(webhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      return { paymentId: payment.id, status: input.status, duplicate: false };
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const [racedEvent] = await db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.provider, input.provider),
          eq(webhookEvents.providerEventId, input.providerEventId),
        ),
      )
      .limit(1);
    if (!racedEvent) throw error;
    const racedPayment = input.paymentId
      ? await getPaymentById(input.paymentId)
      : input.transactionId
        ? await getPaymentByTransactionId(input.transactionId)
        : undefined;
    if (!racedPayment) throw error;
    return {
      paymentId: racedPayment.id,
      status: racedPayment.status,
      duplicate: true,
    };
  }
}

export async function cancelPendingPaymentForOrder(
  orderId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(payments)
    .set({ status: "cancelled" })
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}

export async function listCustomersForStore(
  storeId: number,
): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(eq(customers.storeId, storeId))
    .orderBy(customers.createdAt, customers.id)
    .limit(200);
}

export async function createCustomer(input: InsertCustomer): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(input);
  return getInsertId(result);
}

export async function listLedgerEntriesForStore(
  storeId: number,
): Promise<LedgerEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.storeId, storeId))
    .orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.id))
    .limit(200);
}

export async function createLedgerEntry(
  input: InsertLedgerEntry,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Valor de lançamento inválido");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(customers)
      .where(
        sql`${customers.id} = ${input.customerId} AND ${customers.storeId} = ${input.storeId}`,
      )
      .limit(1);
    const customer = rows[0];
    if (!customer) throw new Error("Cliente não pertence a esta loja");
    if (customer.status !== "active" && input.type !== "payment")
      throw new Error("Cliente bloqueado");

    const current = Number(customer.balance);
    const newBalance =
      input.type === "credit"
        ? current + amount
        : Math.max(0, current - amount);
    if (input.type === "credit" && newBalance > Number(customer.creditLimit))
      throw new Error("Lançamento excede o limite de crédito");

    const result = await tx
      .insert(ledgerEntries)
      .values({ ...input, balanceAfter: newBalance.toFixed(2) });
    await tx
      .update(customers)
      .set({ balance: newBalance.toFixed(2) })
      .where(
        sql`${customers.id} = ${input.customerId} AND ${customers.storeId} = ${input.storeId}`,
      );
    return getInsertId(result);
  });
}

export async function listSalesForStore(storeId: number): Promise<Sale[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sales)
    .where(eq(sales.storeId, storeId))
    .orderBy(desc(sales.createdAt), desc(sales.id))
    .limit(200);
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
  await db
    .insert(pushTokens)
    .values(input)
    .onDuplicateKeyUpdate({
      set: { userId: input.userId, platform: input.platform },
    });
}

export async function listPushTokensForUser(
  userId: number,
): Promise<PushToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function createNotification(
  input: InsertNotification,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(input);
  return getInsertId(result);
}

export async function listNotificationsForUser(
  userId: number,
  limit = 50,
  offset = 0,
): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(Math.min(limit, 100))
    .offset(Math.max(offset, 0));
}

export async function markNotificationRead(
  userId: number,
  notificationId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      sql`${notifications.id} = ${notificationId} AND ${notifications.userId} = ${userId}`,
    );
}

export async function getNotificationPreferences(
  userId: number,
): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (current[0]) return current[0];
  await db
    .insert(notificationPreferences)
    .values({ userId })
    .onDuplicateKeyUpdate({ set: { userId } });
  const created = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (!created[0])
    throw new Error("Notification preferences not found after creation");
  return created[0];
}

export async function updateNotificationPreferences(
  userId: number,
  input: Partial<
    Pick<
      NotificationPreferences,
      "orderUpdates" | "supportMessages" | "promotions" | "pushEnabled"
    >
  >,
): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getNotificationPreferences(userId);
  await db
    .update(notificationPreferences)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(notificationPreferences.id, current.id));
  const updated = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.id, current.id))
    .limit(1);
  if (!updated[0])
    throw new Error("Notification preferences not found after update");
  return updated[0];
}
