import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  courierProfiles,
  customerAddresses,
  customerPaymentPreferences,
  deliveryAssignments,
  orders,
  pushTokens,
  stores,
  users,
} from "../drizzle/schema";
import { revokeAuthSessionsForUser } from "./auth-sessions";
import { getDb } from "./db";
import { PASSWORD_ERROR, verifyPassword } from "./password-auth";

const OPEN_ORDER_STATUSES = ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho"] as const;
const OPEN_ASSIGNMENT_STATUSES = ["assigned", "arrived", "in_transit"] as const;

export const ACCOUNT_BUSY_MESSAGE =
  "Você ainda tem um pedido em andamento. Conclua essa etapa antes de excluir a conta.";

export async function closeAccount(input: { userId: number; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Não foi possível excluir a conta agora. Tente de novo.");
  const rows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = rows[0];
  const passwordHash = user?.passwordHash;
  const matches = passwordHash
    ? await verifyPassword(input.password, passwordHash)
    : false;
  if (!user?.passwordHash || !matches) throw new Error(PASSWORD_ERROR);
  if (user.loginMethod === "closed") return { closed: true as const };

  const customerOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(eq(orders.customerId, user.id), inArray(orders.status, [...OPEN_ORDER_STATUSES])),
    )
    .limit(1);
  const owned = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.ownerId, user.id))
    .limit(1);
  const storeOrders = owned[0]
    ? await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, owned[0].id),
            inArray(orders.status, [...OPEN_ORDER_STATUSES]),
          ),
        )
        .limit(1)
    : [];
  const assignments = await db
    .select({ id: deliveryAssignments.id })
    .from(deliveryAssignments)
    .where(
      and(
        eq(deliveryAssignments.courierId, user.id),
        inArray(deliveryAssignments.status, [...OPEN_ASSIGNMENT_STATUSES]),
      ),
    )
    .limit(1);
  if (customerOrders.length || storeOrders.length || assignments.length) {
    throw new Error(ACCOUNT_BUSY_MESSAGE);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: "Conta encerrada",
        email: null,
        phone: null,
        passwordHash: null,
        loginMethod: "closed",
        openId: `x${randomBytes(16).toString("hex")}`,
        usesCustomerApp: 0,
      })
      .where(eq(users.id, user.id));
    await tx.delete(customerAddresses).where(eq(customerAddresses.userId, user.id));
    await tx
      .delete(customerPaymentPreferences)
      .where(eq(customerPaymentPreferences.userId, user.id));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, user.id));
    await tx
      .update(stores)
      .set({
        isOpen: 0,
        phone: null,
        pixKey: null,
        legalName: null,
        taxId: null,
        responsibleName: null,
        responsibleTaxId: null,
        responsiblePhone: null,
        logoData: null,
      })
      .where(eq(stores.ownerId, user.id));
    await tx
      .update(courierProfiles)
      .set({
        phone: null,
        documentNumber: null,
        documentPhoto: null,
        vehiclePhoto: null,
        selfiePhoto: null,
        pixKey: null,
        vehiclePlate: null,
        lastLatitude: null,
        lastLongitude: null,
        availability: "offline",
        status: "suspended",
      })
      .where(eq(courierProfiles.userId, user.id));
  });
  await revokeAuthSessionsForUser(user.id);
  return { closed: true as const };
}
