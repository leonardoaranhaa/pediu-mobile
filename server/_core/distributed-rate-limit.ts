import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import * as db from "../db";
import {
  boundedRateLimitLimit,
  boundedRateLimitWindow,
  distributedRateLimitKey,
} from "../domain/distributed-rate-limit";

export type DistributedRateLimitContext = Pick<TrpcContext, "req" | "res">;

function networkFingerprint(ctx: DistributedRateLimitContext): string {
  const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
  const salt = process.env.JWT_SECRET?.trim() || "pediu-rate-limit";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${ip}`)
    .digest("hex")
    .slice(0, 48);
}

export async function enforceDistributedRateLimit(
  ctx: DistributedRateLimitContext,
  input: {
    scope: string;
    identity?: string | number;
    limit: number;
    windowMs: number;
    message: string;
  },
) {
  // createCaller unit tests do not have a real response object. The actual
  // Express transport always supplies setHeader and therefore always uses
  // MySQL buckets; this bypass keeps validation-only unit callers offline.
  if (!ctx.req?.headers || typeof ctx.res?.setHeader !== "function") {
    return { allowed: true, remaining: boundedRateLimitLimit(input.limit) - 1 };
  }

  const limit = boundedRateLimitLimit(input.limit);
  const windowMs = boundedRateLimitWindow(input.windowMs);
  const bucketKey = distributedRateLimitKey(
    input.scope,
    String(input.identity ?? "anonymous"),
    networkFingerprint(ctx),
  );

  let decision;
  try {
    decision = await db.consumeDistributedRateLimit({
      bucketKey,
      limit,
      windowMs,
    });
  } catch (error) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Controle de tráfego indisponível. Tente novamente em instantes.",
      cause: error,
    });
  }

  if (!decision.allowed) {
    ctx.res?.setHeader("Retry-After", String(decision.retryAfterSeconds));
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: input.message,
    });
  }

  return decision;
}
