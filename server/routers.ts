import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { fields, machines, files, workLogs, maintenanceLogs, maintenancePlans, users, machineApplications, machineListings, membershipOrders, diamondApplications, workOrders } from "../drizzle/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { SmsServiceFactory, generateCode, hashCode } from "./services/sms";
import { wechatService } from "./services/wechat";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";
import { verificationCodes } from "../drizzle/schema";
import { adminRouter, MEMBERSHIP_PERMISSIONS } from "./adminRouters";

const JWT_SECRET = process.env.JWT_SECRET || "smart_agri_secret";

/**
 * 权限控制辅助函数：根据会员等级对作业需求的联系方式进行脱敏
 */
function maskContactInfo(order: any, user: any) {
  const isPremium = user && (user.role === "admin" || user.membershipLevel === "silver" || user.membershipLevel === "gold" || user.membershipLevel === "diamond");
  
  if (isPremium) {
    return order;
  }

  return {
    ...order,
    contactName: order.contactName ? order.contactName[0] + "**" : null,
    contactPhone: "HIDDEN_FOR_FREE_USER",
    contactWechat: "HIDDEN_FOR_FREE_USER",
    contactAddress: "仅限白银会员查看详细地址",
  };
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // 发送短信验证码
    sendSmsCode: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
        scene: z.enum(["register", "login", "resetPassword", "bindPhone"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        // 频率限制：1分钟内同一手机号只能发一条
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const [recentCode] = await db.select().from(verificationCodes)
          .where(and(
            eq(verificationCodes.phone, input.phone),
            gte(verificationCodes.createdAt, oneMinuteAgo)
          )).limit(1);
        
        if (recentCode) throw new Error("发送太频繁，请稍后再试");

        const code = generateCode();
        const codeHash = hashCode(code);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

        const smsService = SmsServiceFactory.getService();
        const result = await smsService.sendVerificationCode(input.phone, input.scene);

        if (result.success) {
          await db.insert(verificationCodes).values({
            phone: input.phone,
            scene: input.scene,
            codeHash,
            expiresAt,
          });
          return { success: true, mockCode: result.code }; // Mock 模式下返回验证码方便测试
        } else {
          throw new Error(result.message || "短信发送失败");
        }
      }),

    // 手机号注册
    register: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        password: z.string().min(6),
        code: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        // 验证验证码
        const codeHash = hashCode(input.code);
        const [validCode] = await db.select().from(verificationCodes)
          .where(and(
            eq(verificationCodes.phone, input.phone),
            eq(verificationCodes.scene, "register"),
            eq(verificationCodes.codeHash, codeHash),
            eq(verificationCodes.isUsed, 0),
            gte(verificationCodes.expiresAt, new Date())
          )).limit(1);

        if (!validCode) throw new Error("验证码错误或已过期");

        // 检查手机号是否已存在
        const [existingUser] = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
        if (existingUser) throw new Error("该手机号已注册");

        // 标记验证码已使用
        await db.update(verificationCodes).set({ isUsed: 1 }).where(eq(verificationCodes.id, validCode.id));

        const passwordHash = await bcrypt.hash(input.password, 10);
        const [inserted] = await db.insert(users).values({
          openId: `phone_${input.phone}`, // 兼容现有 openId 逻辑
          phone: input.phone,
          passwordHash,
          phoneVerified: 1,
          loginMethod: "phone",
        });

        const openId = `phone_${input.phone}`;
        
        // 使用 SDK 创建兼容的 session token
        const sessionToken = await sdk.createSessionToken(openId, {
          expiresInMs: ONE_YEAR_MS,
          name: input.phone,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    // 手机号登录
    login: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [user] = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
        if (!user || !user.passwordHash) throw new Error("用户不存在或未设置密码");

        const isMatch = await bcrypt.compare(input.password, user.passwordHash);
        if (!isMatch) throw new Error("密码错误");

        // 使用 SDK 创建兼容的 session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          expiresInMs: ONE_YEAR_MS,
          name: user.name || user.phone || "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    // 微信登录相关
    wechatAuthorizeUrl: publicProcedure.query(() => {
      const state = nanoid();
      return { url: wechatService.getAuthorizeUrl(state), state };
    }),

    wechatCallback: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const { openid, unionid } = await wechatService.getAccessToken(input.code);
        
        let [user] = await db.select().from(users).where(eq(users.wechatOpenid, openid)).limit(1);
        let isNewUser = false;

        if (!user) {
          isNewUser = true;
          const [inserted] = await db.insert(users).values({
            openId: `wechat_${openid}`,
            wechatOpenid: openid,
            wechatUnionid: unionid,
            loginMethod: "wechat",
          });
          const userId = (inserted as any).insertId;
          [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        }

        // 使用 SDK 创建兼容的 session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          expiresInMs: ONE_YEAR_MS,
          name: user.name || user.phone || "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, isNewUser, hasPhone: !!user.phone };
      }),

    // 绑定手机号
    bindPhone: protectedProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        // 验证验证码
        const codeHash = hashCode(input.code);
        const [validCode] = await db.select().from(verificationCodes)
          .where(and(
            eq(verificationCodes.phone, input.phone),
            eq(verificationCodes.scene, "bindPhone"),
            eq(verificationCodes.codeHash, codeHash),
            eq(verificationCodes.isUsed, 0),
            gte(verificationCodes.expiresAt, new Date())
          )).limit(1);

        if (!validCode) throw new Error("验证码错误或已过期");

        // 检查手机号是否已被其他账号绑定
        const [existingUser] = await db.select().from(users).where(and(eq(users.phone, input.phone), sql`${users.id} != ${ctx.user.id}`)).limit(1);
        if (existingUser) throw new Error("该手机号已被其他账号绑定");

        await db.update(verificationCodes).set({ isUsed: 1 }).where(eq(verificationCodes.id, validCode.id));
        await db.update(users).set({
          phone: input.phone,
          phoneVerified: 1,
        }).where(eq(users.id, ctx.user.id));

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 注册/审核中心
  onboarding: router({
    submitIdentity: protectedProcedure
      .input(z.object({
        realName: z.string().min(1).max(64),
        organization: z.string().min(1).max(128),
        intro: z.string().min(10).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.update(users).set({
          realName: input.realName,
          organization: input.organization,
          identityIntro: input.intro,
          verificationStatus: "pending",
          verificationSubmittedAt: new Date(),
          verificationReviewedAt: null,
          verificationNote: null,
        }).where(eq(users.id, ctx.user.id));

        return { success: true } as const;
      }),

    submitMachineApplication: protectedProcedure
      .input(z.object({
        brand: z.string().min(1).max(64),
        model: z.string().min(1).max(128),
        type: z.enum(["harvester", "tractor", "seeder", "sprayer"]),
        licensePlate: z.string().max(32).optional(),
        deviceId: z.string().min(3).max(128),
        deviceSecret: z.string().max(128).optional(),
        description: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.insert(machineApplications).values({
          applicantUserId: ctx.user.id,
          brand: input.brand,
          model: input.model,
          type: input.type,
          licensePlate: input.licensePlate,
          deviceId: input.deviceId,
          deviceSecret: input.deviceSecret,
          description: input.description,
          status: "pending",
        });

        return { success: true } as const;
      }),
  }),

  // 管理员审核
  adminReview: router({
    listPending: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { users: [], machines: [], listings: [] };
      const pendingUsers = await db.select().from(users).where(eq(users.verificationStatus, "pending")).orderBy(desc(users.verificationSubmittedAt));
      const pendingMachines = await db.select().from(machineApplications).where(eq(machineApplications.status, "pending")).orderBy(desc(machineApplications.submittedAt));
      const pendingListings = await db.select().from(machineListings).where(eq(machineListings.status, "pending")).orderBy(desc(machineListings.createdAt));
      return { users: pendingUsers, machines: pendingMachines, listings: pendingListings };
    }),

    approveUser: adminProcedure
      .input(z.object({ userId: z.number(), note: z.string().max(2000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.update(users).set({
          verificationStatus: "approved",
          verificationReviewedAt: new Date(),
          verificationNote: input.note ?? null,
        }).where(eq(users.id, input.userId));
        return { success: true } as const;
      }),

    rejectUser: adminProcedure
      .input(z.object({ userId: z.number(), note: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.update(users).set({
          verificationStatus: "rejected",
          verificationReviewedAt: new Date(),
          verificationNote: input.note,
        }).where(eq(users.id, input.userId));
        return { success: true } as const;
      }),

    approveMachine: adminProcedure
      .input(z.object({ applicationId: z.number(), note: z.string().max(2000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        const app = await db.select().from(machineApplications).where(eq(machineApplications.id, input.applicationId)).limit(1);
        const row = app[0];
        if (!row) throw new Error("申请不存在");

        await db.insert(machines).values({
          name: `${row.brand} ${row.model}`,
          type: row.type,
          brand: row.brand,
          model: row.model,
          licensePlate: row.licensePlate,
          deviceId: row.deviceId,
          deviceSecret: row.deviceSecret,
          status: "offline",
          ownerId: row.applicantUserId,
        });

        await db.update(machineApplications).set({
          status: "approved",
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note ?? null,
        }).where(eq(machineApplications.id, input.applicationId));

        return { success: true } as const;
      }),
  }),

  // 会员 & 认证权益
  membership: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const [userRow] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const now = new Date();
      const isActive = userRow?.membershipExpiresAt ? new Date(userRow.membershipExpiresAt) > now : false;

      return {
        membershipLevel: userRow?.membershipLevel ?? "free",
        membershipExpiresAt: userRow?.membershipExpiresAt,
        isActive,
        verificationStatus: userRow?.verificationStatus ?? "unsubmitted",
      };
    }),

    createOrder: protectedProcedure
      .input(z.object({
        plan: z.enum(["silver", "gold", "device_bundle", "diamond"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const price = input.plan === "silver" ? "66.00" : "0.00";

        const [inserted] = await db.insert(membershipOrders).values({
          userId: ctx.user.id,
          plan: input.plan,
          price: price,
          status: "pending",
        });

        return { success: true, orderId: (inserted as any)?.insertId ?? null, amount: price };
      }),

    mockPay: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [order] = await db.select().from(membershipOrders).where(eq(membershipOrders.id, input.orderId)).limit(1);
        if (!order || order.userId !== ctx.user.id) throw new Error("订单不存在或无权操作");

        const now = new Date();
        const expires = new Date(now);
        expires.setFullYear(expires.getFullYear() + 1);

        await db.update(membershipOrders).set({
          status: "paid",
          paidAt: now,
        }).where(eq(membershipOrders.id, input.orderId));

        await db.update(users).set({
          membershipLevel: order.plan as any,
          membershipExpiresAt: expires,
          verificationStatus: "approved", // 模拟支付成功后自动通过基础审核
        }).where(eq(users.id, ctx.user.id));

        return { success: true, nextLevel: order.plan, expiresAt: expires };
      }),
  }),

  // 二手农机挂牌
  machineListings: router({
    listApproved: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machineListings).where(eq(machineListings.status, "approved")).orderBy(desc(machineListings.createdAt));
    }),

    submit: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        brand: z.string().min(1).max(64),
        model: z.string().min(1).max(128),
        price: z.number().nonnegative().optional(),
        location: z.string().max(128).optional(),
        contactPhone: z.string().max(32).optional(),
        description: z.string().max(5000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.insert(machineListings).values({
          sellerUserId: ctx.user.id,
          title: input.title,
          brand: input.brand,
          model: input.model,
          price: input.price?.toString(),
          location: input.location,
          contactPhone: input.contactPhone,
          description: input.description,
          status: "pending",
        });

        return { success: true } as const;
      }),
  }),

  // 作业交易
  workOrders: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orders = await db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
      return orders.map(o => maskContactInfo(o, ctx.user));
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return null;
        const [order] = await db.select().from(workOrders).where(eq(workOrders.id, input.id)).limit(1);
        if (!order) return null;
        return maskContactInfo(order, ctx.user);
      }),

    submit: protectedProcedure
      .input(z.object({
        workType: z.string().min(1).max(64),
        fieldName: z.string().min(1).max(128),
        area: z.number().positive(),
        cropType: z.string().min(1).max(64),
        description: z.string().max(5000).optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        preferredTime: z.string().max(32).optional(),
        priceType: z.enum(["fixed", "bidding"]),
        fixedPrice: z.number().nonnegative().optional(),
        biddingStartPrice: z.number().nonnegative().optional(),
        contactName: z.string().max(64).optional(),
        contactPhone: z.string().max(32).optional(),
        contactWechat: z.string().max(64).optional(),
        contactAddress: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.insert(workOrders).values({
          publisherUserId: ctx.user.id,
          workType: input.workType,
          fieldName: input.fieldName,
          area: input.area.toString(),
          cropType: input.cropType,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          preferredTime: input.preferredTime,
          priceType: input.priceType,
          fixedPrice: input.fixedPrice?.toString(),
          biddingStartPrice: input.biddingStartPrice?.toString(),
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactWechat: input.contactWechat,
          contactAddress: input.contactAddress,
          status: "open",
        });

        return { success: true };
      }),
  }),

  // 地块管理
  fields: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(fields).orderBy(desc(fields.createdAt));
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(fields).where(eq(fields.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        cropType: z.string().min(1),
        area: z.number().positive(),
        boundaryGeoJson: z.string().optional(),
        centerLat: z.number().optional(),
        centerLng: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        await db.insert(fields).values({
          name: input.name,
          cropType: input.cropType,
          area: input.area.toString(),
          boundaryGeoJson: input.boundaryGeoJson,
          centerLat: input.centerLat?.toString(),
          centerLng: input.centerLng?.toString(),
          ownerId: ctx.user.id,
        });
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
