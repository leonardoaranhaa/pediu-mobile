import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { passwordResets, users, type User } from "../drizzle/schema";
import { isAdminEmail } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getDb, getUserByOpenId, grantAccountRole } from "./db";
import { isUniqueConstraintError } from "./domain/idempotency";
import { revokeAuthSessionsForUser } from "./auth-sessions";
import { SESSION_TTL_MS } from "../shared/const";

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MS = 30 * 60 * 1000;

export const LOGIN_ERROR = "E-mail ou senha não conferem.";
export const SIGNUP_ERROR =
  "Não foi possível criar a conta. Confira os dados ou tente entrar.";
export const RESET_ERROR =
  "Não foi possível trocar a senha. Confira o código e tente de novo.";
export const PASSWORD_ERROR = "A senha atual não confere.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string | undefined): string | null {
  const value = phone?.trim() ?? "";
  if (!value) return null;
  if (!/^[0-9+()\-.\s]{8,32}$/.test(value)) {
    throw new Error("Telefone inválido.");
  }
  return value;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

let dummyHash: Promise<string> | undefined;
function dummyPasswordHash() {
  dummyHash ??= hashPassword("pediu-dummy-password");
  return dummyHash;
}

export type PublicAccount = Omit<User, "passwordHash">;

export function toPublicAccount(user: User): PublicAccount {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0];
}

async function promoteAdmin(user: User): Promise<User> {
  if (!user.email || !isAdminEmail(user.email) || user.role === "admin") {
    return user;
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, user.id));
  await grantAccountRole(user.id, "admin");
  return { ...user, role: "admin" };
}

async function issueSession(user: User, expiresInMs = SESSION_TTL_MS) {
  const token = await sdk.createSessionToken(user.openId, {
    name: user.name || "Pediu",
    expiresInMs,
  });
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
  return { token, expiresAt, user: toPublicAccount(user) };
}

export async function signupAccount(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  intent?: "customer" | "merchant" | "courier";
}) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const passwordHash = await hashPassword(input.password);
  const openId = `p${randomBytes(16).toString("hex")}`;
  const admin = isAdminEmail(email);
  const intent = input.intent ?? "customer";
  const role = admin
    ? "admin"
    : intent === "merchant"
      ? "merchant"
      : intent === "courier"
        ? "courier"
        : "user";
  const accountRole = admin
    ? "admin"
    : intent === "merchant"
      ? "merchant"
      : intent === "courier"
        ? "courier"
        : "customer";
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(users).values({
      openId,
      name: input.name.trim(),
      email,
      phone,
      passwordHash,
      loginMethod: "password",
      role,
      usesCustomerApp: accountRole === "customer" ? 1 : 0,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error(SIGNUP_ERROR);
    throw error;
  }
  const created = await getUserByOpenId(openId);
  if (!created) throw new Error(SIGNUP_ERROR);
  await grantAccountRole(created.id, accountRole);
  return issueSession(created);
}

export async function loginAccount(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = await getUserByEmail(email);
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(input.password, passwordHash);
  if (!user?.passwordHash || !matches) throw new Error(LOGIN_ERROR);
  const next = await promoteAdmin({ ...user, lastSignedIn: new Date() });
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, next.id));
  return issueSession(next);
}

export async function changeAccountPassword(input: {
  userId: number;
  currentPassword: string;
  nextPassword: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  const user = rows[0];
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(input.currentPassword, passwordHash);
  if (!user?.passwordHash || !matches) throw new Error(PASSWORD_ERROR);
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.nextPassword) })
    .where(eq(users.id, user.id));
  await revokeAuthSessionsForUser(user.id);
  return issueSession(user);
}

function hashResetCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function issuePasswordReset(input: {
  email: string;
  createdByUserId: number;
}) {
  const email = normalizeEmail(input.email);
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Não encontramos uma conta com esse e-mail.");
  const code = randomInt(0, 100_000_000).toString().padStart(8, "0");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(
      and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)),
    );
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await db.insert(passwordResets).values({
    userId: user.id,
    codeHash: hashResetCode(code),
    expiresAt,
    createdByUserId: input.createdByUserId,
  });
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function resetAccountPassword(input: {
  email: string;
  code: string;
  nextPassword: string;
}) {
  const email = normalizeEmail(input.email);
  const user = await getUserByEmail(email);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = user
    ? await db
        .select()
        .from(passwordResets)
        .where(
          and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)),
        )
    : [];
  const presented = Buffer.from(hashResetCode(input.code.trim()));
  const match = rows.find((row) => {
    if (row.expiresAt.getTime() <= Date.now()) return false;
    const stored = Buffer.from(row.codeHash);
    return stored.length === presented.length && timingSafeEqual(stored, presented);
  });
  if (!user || !match) throw new Error(RESET_ERROR);
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.id, match.id));
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.nextPassword) })
    .where(eq(users.id, user.id));
  await revokeAuthSessionsForUser(user.id);
  return { reset: true as const };
}
