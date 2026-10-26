import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { assistantConfirmations } from "../drizzle/schema";
import { getDb } from "./db";

const TTL_MS = 10 * 60_000;

export type StoredConfirmation = {
  tool: string;
  payload: unknown;
  summary: string;
};

type MemoryRow = StoredConfirmation & {
  userId: number;
  expiresAt: number;
  used: boolean;
};

const memory = new Map<string, MemoryRow>();
let preferMemory = false;

function secret() {
  return process.env.JWT_SECRET?.trim() || "pediu-assistant";
}

function sign(id: string, userId: number, expiresAt: number, tool: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${id}.${userId}.${expiresAt}.${tool}`)
    .digest("hex")
    .slice(0, 32);
}

function parseToken(token: string, userId: number) {
  const [id, expRaw, sig, extra] = token.split(".");
  const expiresAt = Number(expRaw);
  if (!id || !sig || extra || !Number.isFinite(expiresAt)) return null;
  return { id, expiresAt, sig };
}

function tokenFor(id: string, userId: number, expiresAt: number, tool: string) {
  return `${id}.${expiresAt}.${sign(id, userId, expiresAt, tool)}`;
}

function signaturesMatch(token: string, userId: number, tool: string) {
  const parsed = parseToken(token, userId);
  if (!parsed) return null;
  const expected = sign(parsed.id, userId, parsed.expiresAt, tool);
  const left = Buffer.from(parsed.sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  return parsed;
}

function missingRelation(error: unknown) {
  const queue: unknown[] = [error];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    const record = current as { code?: string; cause?: unknown };
    if (record.code === "42P01") return true;
    if (record.cause) queue.push(record.cause);
  }
  return false;
}

export function resetAssistantConfirmationsForTests() {
  memory.clear();
  preferMemory = true;
}

export async function saveAssistantConfirmation(input: {
  userId: number;
  tool: string;
  payload: unknown;
  summary: string;
  now?: number;
  ttlMs?: number;
}) {
  const now = input.now ?? Date.now();
  const id = crypto.randomBytes(16).toString("hex");
  const expiresAt = now + (input.ttlMs ?? TTL_MS);
  const summary = input.summary.slice(0, 500);
  const row: MemoryRow = {
    userId: input.userId,
    tool: input.tool,
    payload: input.payload,
    summary,
    expiresAt,
    used: false,
  };
  const db = preferMemory ? null : await getDb();
  if (!db) {
    memory.set(id, row);
    return { token: tokenFor(id, input.userId, expiresAt, input.tool), summary };
  }
  try {
    await db.insert(assistantConfirmations).values({
      id,
      userId: input.userId,
      tool: input.tool,
      payload: JSON.stringify(input.payload),
      summary,
      expiresAt: new Date(expiresAt),
    });
  } catch (error) {
    if (!missingRelation(error)) throw error;
    preferMemory = true;
    memory.set(id, row);
  }
  return { token: tokenFor(id, input.userId, expiresAt, input.tool), summary };
}

export type TakeResult =
  | { ok: true; confirmation: StoredConfirmation }
  | { ok: false; reason: "invalid" | "expired" | "used" | "missing" };

export async function takeAssistantConfirmation(input: {
  token: string;
  userId: number;
  now?: number;
  consume?: boolean;
}): Promise<TakeResult> {
  const now = input.now ?? Date.now();
  const rough = input.token.split(".");
  if (rough.length !== 3) return { ok: false, reason: "invalid" };
  const id = rough[0];
  const db = preferMemory ? null : await getDb();
  if (!db) return takeMemory(id, input, now);
  try {
    const existing = (
      await db
        .select()
        .from(assistantConfirmations)
        .where(
          and(
            eq(assistantConfirmations.id, id),
            eq(assistantConfirmations.userId, input.userId),
          ),
        )
        .limit(1)
    )[0];
    if (!existing) return { ok: false, reason: "missing" };
    const parsed = signaturesMatch(input.token, input.userId, existing.tool);
    if (!parsed) return { ok: false, reason: "invalid" };
    if (existing.usedAt) return { ok: false, reason: "used" };
    if (existing.expiresAt.getTime() <= now || parsed.expiresAt <= now) {
      return { ok: false, reason: "expired" };
    }
    if (input.consume === false) {
      return {
        ok: true,
        confirmation: {
          tool: existing.tool,
          payload: JSON.parse(existing.payload),
          summary: existing.summary,
        },
      };
    }
    const claimed = await db
      .update(assistantConfirmations)
      .set({ usedAt: new Date(now) })
      .where(
        and(
          eq(assistantConfirmations.id, id),
          eq(assistantConfirmations.userId, input.userId),
          isNull(assistantConfirmations.usedAt),
          sql`${assistantConfirmations.expiresAt} > ${new Date(now)}`,
        ),
      )
      .returning({ id: assistantConfirmations.id });
    if (!claimed.length) return { ok: false, reason: "used" };
    return {
      ok: true,
      confirmation: {
        tool: existing.tool,
        payload: JSON.parse(existing.payload),
        summary: existing.summary,
      },
    };
  } catch (error) {
    if (!missingRelation(error)) throw error;
    preferMemory = true;
    return takeMemory(id, input, now);
  }
}

function takeMemory(
  id: string,
  input: { token: string; userId: number; consume?: boolean },
  now: number,
): TakeResult {
  const row = memory.get(id);
  if (!row || row.userId !== input.userId) return { ok: false, reason: "missing" };
  const parsed = signaturesMatch(input.token, input.userId, row.tool);
  if (!parsed) return { ok: false, reason: "invalid" };
  if (row.used) return { ok: false, reason: "used" };
  if (row.expiresAt <= now || parsed.expiresAt <= now) return { ok: false, reason: "expired" };
  if (input.consume !== false) row.used = true;
  return {
    ok: true,
    confirmation: { tool: row.tool, payload: row.payload, summary: row.summary },
  };
}
