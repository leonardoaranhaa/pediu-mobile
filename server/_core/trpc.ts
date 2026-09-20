import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { recordOperation } from "./observability";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const observabilityMiddleware = t.middleware(async ({ path, next }) => {
  const startedAt = performance.now();
  try {
    const result = await next();
    recordOperation({
      procedure: path,
      durationMs: performance.now() - startedAt,
      outcome: "ok",
    });
    return result;
  } catch (error) {
    recordOperation({
      procedure: path,
      durationMs: performance.now() - startedAt,
      outcome: "error",
      code: error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
    });
    throw error;
  }
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
