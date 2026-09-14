import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Customer, InsertCustomer, InsertLedgerEntry, InsertOrder, InsertProduct, InsertPushToken, InsertSale, InsertStore, InsertUser, LedgerEntry, Order, Product, PushToken, Sale, Store, customers, ledgerEntries, orderItems, orders, payments, products, pushTokens, sales, stores, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getStoreForOwner(ownerId: number): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function createStore(input: InsertStore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stores).values(input);
  return Number((result as unknown as { insertId: number | string }).insertId);
}

export async function listAvailableProducts(category?: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products);
  return result.filter((product) => Boolean(product.available) && (!category || category === "Tudo" || product.category === category));
}

export async function createProduct(input: InsertProduct): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(input);
  return Number((result as unknown as { insertId: number | string }).insertId);
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

export async function createOrder(input: InsertOrder, items: Array<{ productId: number; quantity: number; unitPrice: string }>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(input);
  const orderId = Number((result as unknown as { insertId: number | string }).insertId);
  if (items.length > 0) {
    await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId })));
  }
  return orderId;
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

export async function createPendingPixPayment(orderId: number, pixKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values({ orderId, method: "pix", status: "pending", pixKey });
  return Number((result as unknown as { insertId: number | string }).insertId);
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
  return Number((result as unknown as { insertId: number | string }).insertId);
}

export async function listLedgerEntriesForStore(storeId: number): Promise<LedgerEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.storeId, storeId));
}

export async function createLedgerEntry(input: InsertLedgerEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ledgerEntries).values(input);
  const delta = input.type === "credit" ? input.amount : `-${input.amount}`;
  await db.update(customers).set({ balance: sql`GREATEST(0, ${customers.balance} + ${delta})` }).where(eq(customers.id, input.customerId));
  return Number((result as unknown as { insertId: number | string }).insertId);
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
  return Number((result as unknown as { insertId: number | string }).insertId);
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
