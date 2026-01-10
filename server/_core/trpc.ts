import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

type AuthedContext = TrpcContext & { user: NonNullable<TrpcContext["user"]> };

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    // FIX: 让 protectedProcedure 的 ctx.user 在类型层面收窄为非空，避免到处写 ctx.user!。
    ctx: { ...ctx, user: ctx.user } as AuthedContext,
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // 同时支持 role='admin' 或 isAdmin=1 的用户
    const isAdmin = ctx.user.role === 'admin' || ctx.user.isAdmin === 1;
    if (!isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      // FIX: adminProcedure 下 ctx.user 类型收窄为非空且已通过管理员校验
      ctx: { ...ctx, user: ctx.user } as AuthedContext,
    });
  }),
);
