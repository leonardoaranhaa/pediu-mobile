import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { recordOperation } from "./observability";
import type { TrpcContext } from "./context";
import { publicError } from "./public-error";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const observabilityMiddleware = t.middleware(async ({ path, next }) => {
  const startedAt = performance.now();
  // In tRPC v11 `next()` does not throw: a failed procedure comes back as
  // `{ ok: false, error }`. Map it here so business rules become 4xx and
  // database internals never reach the app.
  let result: Awaited<ReturnType<typeof next>>;
  try {
    result = await next();
  } catch (error) {
    const mapped = publicError(error);
    recordOperation({
      procedure: path,
      durationMs: performance.now() - startedAt,
      outcome: "error",
      code: mapped.code,
    });
    throw mapped;
  }
  if (!result.ok) {
    const mapped = publicError(result.error);
    if (mapped.code === "INTERNAL_SERVER_ERROR")
      console.error(`[Pediu][Error] ${path}`, result.error.cause ?? result.error);
    recordOperation({
      procedure: path,
      durationMs: performance.now() - startedAt,
      outcome: "error",
      code: mapped.code,
    });
    throw mapped;
  }
  recordOperation({
    procedure: path,
    durationMs: performance.now() - startedAt,
    outcome: "ok",
  });
  return result;
});

const observedProcedure = t.procedure.use(observabilityMiddleware);

export const router = t.router;
export const publicProcedure = observedProcedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = observedProcedure.use(requireUser);

export const adminProcedure = observedProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
