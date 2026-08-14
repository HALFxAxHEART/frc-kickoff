import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { NotFoundError, ValidationError } from "../lib/errors";

const t = initTRPC.context<Context>().create();

export const router = t.router;

/**
 * Services stay framework-agnostic (NotFoundError/ValidationError in lib/errors.ts) so
 * this middleware is the one place that translates those into proper tRPC error codes.
 * tRPC's own middleware chain never rejects `next()` — a downstream throw comes back as
 * `{ ok: false, error }` with the original preserved as `error.cause`, so this inspects
 * the result rather than using try/catch (a try/catch here would never fire).
 */
const errorMappingMiddleware = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const cause = result.error.cause;
    if (cause instanceof NotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: cause.message, cause });
    if (cause instanceof ValidationError) throw new TRPCError({ code: "BAD_REQUEST", message: cause.message, cause });
  }
  return result;
});

export const publicProcedure = t.procedure.use(errorMappingMiddleware);
