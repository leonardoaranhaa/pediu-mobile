import { TRPCError } from "@trpc/server";
import { FRIENDLY_FAILURE, friendlyUserMessage } from "../../lib/user-message";
import { isUniqueConstraintError } from "../domain/idempotency";

const RACE_LOST =
  "Outra pessoa ou outra tela fez isso primeiro. Atualize e confira.";

function looksLikeDatabaseError(error: unknown) {
  const seen = new Set<unknown>();
  const visit = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return false;
    seen.add(candidate);
    const value = candidate as { code?: unknown; message?: unknown; cause?: unknown; severity?: unknown };
    const code = String(value.code ?? "");
    if (/^[0-9A-Z]{5}$/.test(code) || value.severity) return true;
    if (/failed query|drizzle|postgres/i.test(String(value.message ?? ""))) return true;
    return visit(value.cause);
  };
  return visit(error);
}

/**
 * What the app is allowed to see when a procedure fails.
 *
 * - Errors already raised as TRPCError keep their code; the message is cleaned.
 * - A plain `new Error("...")` is a business rule written for people (e.g. "Estoque
 *   insuficiente"), so it becomes 400 with that text instead of a 500.
 * - A unique-key violation means someone else got there first: 409.
 * - Anything else (driver, SQL, crashes) becomes a generic 500 with no internals.
 */
export function publicError(error: unknown) {
  const original =
    error instanceof TRPCError && error.code === "INTERNAL_SERVER_ERROR" && error.cause
      ? error.cause
      : error;

  if (original instanceof TRPCError) {
    return new TRPCError({
      code: original.code,
      message: friendlyUserMessage(original.message),
    });
  }
  if (isUniqueConstraintError(original)) {
    return new TRPCError({ code: "CONFLICT", message: RACE_LOST, cause: original });
  }
  if (
    original instanceof Error &&
    original.constructor === Error &&
    !looksLikeDatabaseError(original)
  ) {
    const message = friendlyUserMessage(original.message);
    return new TRPCError({
      code: message === FRIENDLY_FAILURE ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
      message,
      cause: original,
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: FRIENDLY_FAILURE,
    cause: original,
  });
}
