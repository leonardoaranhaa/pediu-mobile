import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { authSessions } from "../drizzle/schema";
import { getDb } from "./db";

export function hashSessionSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function insertAuthSession(input: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .insert(authSessions)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    })
    .returning({ id: authSessions.id });
  const id = rows[0]?.id;
  if (!id) throw new Error("Session was not stored");
  return { id };
}

export async function getActiveAuthSession(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.id, id))
    .limit(1);
  const session = rows[0];
  if (!session || session.revokedAt) return undefined;
  if (session.expiresAt.getTime() <= Date.now()) return undefined;
  return session;
}

export function sessionSecretMatches(storedHash: string, secret: string) {
  const actual = Buffer.from(hashSessionSecret(secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function touchAuthSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(authSessions.id, id));
}

export async function rotateAuthSession(input: {
  id: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(authSessions)
    .set({
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      lastUsedAt: new Date(),
    })
    .where(and(eq(authSessions.id, input.id), isNull(authSessions.revokedAt)));
}

export async function revokeAuthSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt)));
}

export async function revokeAuthSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}
