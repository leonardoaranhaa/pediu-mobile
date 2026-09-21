import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AdminAuditLog, Customer, CustomerAddress, InsertAdminAuditLog, InsertCustomer, InsertCustomerAddress, InsertLedgerEntry, InsertNotification, InsertOrder, InsertProduct, InsertPushToken, InsertSale, InsertStore, InsertUser, LedgerEntry, Notification, Order, Payment, Product, PushToken, Sale, Store, adminAuditLogs, customerAddresses, customers, ledgerEntries, notifications, orderItems, orders, payments, products, pushTokens, sales, stores, users } from "../drizzle/schema";
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
  return db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId)).orderBy(customerAddresses.createdAt);
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
  const result = await db.insert(stores).values(input);
  return getInsertId(result);
}

export type MarketplaceProduct = Product & { storeName: string; deliveryFee: string };

export async function listAvailableProducts(category?: string): Promise<MarketplaceProduct[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(products.available, 1), eq(stores.isOpen, 1)];
  if (category && category !== "Tudo") filters.push(eq(products.category, category));

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
    .where(and(...filters));

  return result;
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
  return db.select().from(products).where(eq(products.storeId, storeId));
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

export async function listOrdersForStore(storeId: number): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.storeId, storeId));
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

export async function createOrder(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string }>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(input);
  const orderId = getInsertId(result);
  if (items.length > 0) await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId })));
  return orderId;
}

export async function createOrderWithPayment(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string }>, paymentMethod: "pix" | "card" | "cash"): Promise<{ orderId: number; paymentId: number }> {
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

export async function createOrderWithFiado(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string }>, creditCustomerId: number, storeId: number): Promise<number> {
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

export async function listOrdersForCustomer(customerId: number): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerId, customerId));
}

export async function updateOrderStatus(orderId: number, status: Order["status"]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
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
  if (current === "pending") return next === "paid" || next === "failed";
  if (current === "failed") return next === "pending";
  return false;
}

export async function updatePaymentStatus(paymentId: number, status: Exclude<PaymentStatus, "cancelled">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
}

export async function cancelPendingPaymentForOrder(orderId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status: "cancelled" }).where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}

export async function listCustomersForStore(storeId: number): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.storeId, storeId));
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
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.storeId, storeId));
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
  return db.select().from(sales).where(eq(sales.storeId, storeId));
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

export async function listNotificationsForUser(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function markNotificationRead(userId: number, notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ readAt: new Date() }).where(sql`${notifications.id} = ${notificationId} AND ${notifications.userId} = ${userId}`);
}
