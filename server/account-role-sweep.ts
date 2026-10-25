import { eq } from "drizzle-orm";
import { accountRoles, courierProfiles, stores, users } from "../drizzle/schema";
import {
  legacyRoleFromAccount,
  resolveOriginalRole,
  type AccountRole,
} from "../shared/account-roles";
import { isAdminEmail } from "./_core/env";
import { getDb } from "./db";

let running: Promise<void> | null = null;
let lastRun = 0;

export async function sweepAccountRoles() {
  if (running) return running;
  if (Date.now() - lastRun < 60_000) return;
  running = runSweep().finally(() => {
    running = null;
    lastRun = Date.now();
  });
  return running;
}

async function runSweep() {
  try {
    const db = await getDb();
    if (!db) return;
    const people = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email,
        usesCustomerApp: users.usesCustomerApp,
        createdAt: users.createdAt,
        loginMethod: users.loginMethod,
      })
      .from(users);
    const roleRows = await db
      .select({
        userId: accountRoles.userId,
        role: accountRoles.role,
      })
      .from(accountRoles);
    const storeRows = await db
      .select({
        ownerId: stores.ownerId,
        createdAt: stores.createdAt,
        isOpen: stores.isOpen,
      })
      .from(stores);
    const courierRows = await db
      .select({
        userId: courierProfiles.userId,
        createdAt: courierProfiles.createdAt,
        status: courierProfiles.status,
      })
      .from(courierProfiles);

    const rolesByUser = new Map<number, AccountRole[]>();
    for (const row of roleRows) {
      const list = rolesByUser.get(row.userId) ?? [];
      list.push(row.role);
      rolesByUser.set(row.userId, list);
    }
    const storeByOwner = new Map<number, { createdAt: Date; isOpen: number }>();
    for (const row of storeRows) {
      const current = storeByOwner.get(row.ownerId);
      if (!current || row.createdAt < current.createdAt) {
        storeByOwner.set(row.ownerId, { createdAt: row.createdAt, isOpen: row.isOpen });
      }
    }
    const courierByUser = new Map<number, { createdAt: Date; status: string }>();
    for (const row of courierRows) {
      courierByUser.set(row.userId, { createdAt: row.createdAt, status: row.status });
    }

    for (const person of people) {
      if (person.loginMethod === "closed") continue;
      if (person.role === "admin" || isAdminEmail(person.email ?? "")) {
        if (person.role !== "admin") {
          await db.update(users).set({ role: "admin" }).where(eq(users.id, person.id));
        }
        await db
          .insert(accountRoles)
          .values({ userId: person.id, role: "admin" })
          .onConflictDoNothing({ target: [accountRoles.userId, accountRoles.role] });
        continue;
      }
      const kept = resolveOriginalRole({
        legacyRole: person.role,
        usesCustomerApp: person.usesCustomerApp,
        userCreatedAt: person.createdAt,
        storeCreatedAt: storeByOwner.get(person.id)?.createdAt ?? null,
        courierCreatedAt: courierByUser.get(person.id)?.createdAt ?? null,
      });
      const current = rolesByUser.get(person.id) ?? [];
      const already =
        current.length === 1 &&
        current[0] === kept &&
        person.role === legacyRoleFromAccount(kept) &&
        person.usesCustomerApp === (kept === "customer" ? 1 : 0);
      if (!already) {
        await db.delete(accountRoles).where(eq(accountRoles.userId, person.id));
        await db.insert(accountRoles).values({ userId: person.id, role: kept });
        await db
          .update(users)
          .set({
            role: legacyRoleFromAccount(kept),
            usesCustomerApp: kept === "customer" ? 1 : 0,
          })
          .where(eq(users.id, person.id));
      }
      const store = storeByOwner.get(person.id);
      if (store && kept !== "merchant" && store.isOpen !== 0) {
        await db.update(stores).set({ isOpen: 0 }).where(eq(stores.ownerId, person.id));
      }
      const courier = courierByUser.get(person.id);
      if (courier && kept !== "courier" && courier.status !== "suspended") {
        await db
          .update(courierProfiles)
          .set({ status: "suspended", availability: "offline" })
          .where(eq(courierProfiles.userId, person.id));
      }
    }
  } catch (error) {
    console.warn("[AccountRoles] Could not settle one role per account", error);
  }
}
