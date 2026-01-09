import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { fields, machines, files, workLogs, maintenanceLogs, maintenancePlans, users, machineApplications, machineListings, membershipOrders, diamondApplications, workOrders } from "../drizzle/schema";
import { eq, desc, gte, and } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 注册/审核中心（正式运行）
  onboarding: router({
    // 提交身份介绍（提交后进入 pending，等待人工审核）
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

    // 提交设备注册申请（待审核）
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

  // 管理员审核（授予发布权限）
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

        // 审核通过：写入 machines 表（可用于正式运行展示）
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

    rejectMachine: adminProcedure
      .input(z.object({ applicationId: z.number(), note: z.string().min(1).max(2000) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.update(machineApplications).set({
          status: "rejected",
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note,
        }).where(eq(machineApplications.id, input.applicationId));
        return { success: true } as const;
      }),

    approveListing: adminProcedure
      .input(z.object({ listingId: z.number(), note: z.string().max(2000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.update(machineListings).set({
          status: "approved",
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note ?? null,
        }).where(eq(machineListings.id, input.listingId));
        return { success: true } as const;
      }),

    rejectListing: adminProcedure
      .input(z.object({ listingId: z.number(), note: z.string().min(1).max(2000) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.update(machineListings).set({
          status: "rejected",
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note,
        }).where(eq(machineListings.id, input.listingId));
        return { success: true } as const;
      }),
  }),

  // 会员 & 认证权益
  membership: router({
    // 获取会员状态 + 今日发布计数
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const [userRow] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayListings = await db.select().from(machineListings)
        .where(and(eq(machineListings.sellerUserId, ctx.user.id), gte(machineListings.createdAt, today)));
      const todayOrders = await db.select().from(workOrders)
        .where(and(eq(workOrders.publisherUserId, ctx.user.id), gte(workOrders.createdAt, today)));

      return {
        membershipLevel: userRow?.membershipLevel ?? "free",
        membershipExpiresAt: userRow?.membershipExpiresAt,
        devicesOwned: userRow?.devicesOwned ?? 0,
        verificationStatus: userRow?.verificationStatus ?? "unsubmitted",
        todayListings: todayListings.length,
        todayWorkOrders: todayOrders.length,
      };
    }),

    // 创建会员/设备订单（当前支付渠道占位，需线下或后续接入）
    createOrder: protectedProcedure
      .input(z.object({
        plan: z.enum(["silver", "gold", "device_bundle", "diamond"]),
        deviceCount: z.number().int().min(0).default(0).optional(),
        paymentChannel: z.string().max(64).optional(),
        note: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const deviceCount = input.deviceCount ?? 0;
        let price = 66; // 白银会员年费
        if (input.plan === "device_bundle") {
          price = 0; // 设备价格线下结算，此处仅记录订单
        }
        if (input.plan === "gold") {
          price = 0; // 通过设备数量升级黄金，不单独售卖
        }

        const inserted = await db.insert(membershipOrders).values({
          userId: ctx.user.id,
          plan: input.plan,
          deviceCount,
          price: price.toString(),
          paymentChannel: input.paymentChannel ?? "manual",
          note: input.note,
        });

        return { success: true, orderId: (inserted as any)?.insertId ?? null, paymentHint: "当前未接入在线支付，请联系管理员确认收款后由管理员标记已支付" };
      }),

    // 管理员标记订单已支付并升级会员
    markPaid: adminProcedure
      .input(z.object({
        orderId: z.number(),
        note: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [order] = await db.select().from(membershipOrders).where(eq(membershipOrders.id, input.orderId)).limit(1);
        if (!order) throw new Error("订单不存在");

        await db.update(membershipOrders).set({
          status: "paid",
          paidAt: new Date(),
          note: input.note ?? order.note,
        }).where(eq(membershipOrders.id, input.orderId));

        const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
        if (!user) throw new Error("用户不存在");

        const now = new Date();
        const base = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : now;
        const start = base > now ? base : now;
        const expires = new Date(start);
        expires.setFullYear(expires.getFullYear() + 1);

        let nextLevel = user.membershipLevel ?? "free";
        let devicesOwned = user.devicesOwned ?? 0;

        if (order.plan === "silver") {
          nextLevel = nextLevel === "diamond" ? nextLevel : "silver";
        } else if (order.plan === "gold") {
          nextLevel = nextLevel === "diamond" ? nextLevel : "gold";
        } else if (order.plan === "device_bundle") {
          devicesOwned += order.deviceCount ?? 0;
          if (devicesOwned >= 10) {
            nextLevel = nextLevel === "diamond" ? nextLevel : "gold";
          } else if (nextLevel === "free") {
            nextLevel = "silver";
          }
        } else if (order.plan === "diamond") {
          nextLevel = "diamond";
        }

        await db.update(users).set({
          membershipLevel: nextLevel,
          membershipExpiresAt: expires,
          devicesOwned,
          membershipSource: order.plan,
          membershipNote: input.note ?? user.membershipNote,
          verificationStatus: nextLevel !== "free" ? "approved" : user.verificationStatus,
          verificationReviewedAt: nextLevel !== "free" ? new Date() : user.verificationReviewedAt,
        }).where(eq(users.id, order.userId));

        return { success: true, nextLevel, devicesOwned, expiresAt: expires };
      }),

    // 钻石会员申请
    applyDiamond: protectedProcedure
      .input(z.object({
        region: z.string().min(2).max(128),
        organization: z.string().max(128).optional(),
        contact: z.string().max(64).optional(),
        message: z.string().min(10).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.insert(diamondApplications).values({
          userId: ctx.user.id,
          region: input.region,
          organization: input.organization,
          contact: input.contact,
          message: input.message,
          status: "pending",
        });

        return { success: true };
      }),

    // 管理员查看/审核钻石申请
    listDiamond: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(diamondApplications).orderBy(desc(diamondApplications.submittedAt));
    }),

    reviewDiamond: adminProcedure
      .input(z.object({ id: z.number(), approve: z.boolean(), note: z.string().max(2000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.update(diamondApplications).set({
          status: input.approve ? "approved" : "rejected",
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note,
        }).where(eq(diamondApplications.id, input.id));

        if (input.approve) {
          const [app] = await db.select().from(diamondApplications).where(eq(diamondApplications.id, input.id)).limit(1);
          if (app) {
            await db.update(users).set({
              membershipLevel: "diamond",
              membershipExpiresAt: null, // 钻石以合同约定为准
              membershipSource: "diamond",
              membershipNote: input.note,
              verificationStatus: "approved",
              verificationReviewedAt: new Date(),
            }).where(eq(users.id, app.userId));
          }
        }

        return { success: true };
      }),
  }),

  // 二手农机挂牌
  machineListings: router({
    // 前台展示：仅返回已审核通过的挂牌
    listApproved: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machineListings).where(eq(machineListings.status, "approved")).orderBy(desc(machineListings.createdAt));
    }),

    // 提交挂牌：仅审核通过用户（或管理员）可发布
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

        // 权限门禁：会员 + 实名 + 日额度
        const userRow = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const user = userRow[0];
        const membershipLevel = user?.membershipLevel ?? "free";
        const verificationStatus = user?.verificationStatus ?? "unsubmitted";
        const isAdmin = ctx.user.role === "admin";

        if (!isAdmin) {
          if (membershipLevel === "free") {
            throw new Error("未开通发布权限：请先升级为白银会员或以上");
          }
          if (membershipLevel === "silver" && verificationStatus !== "approved") {
            throw new Error("白银会员需通过实名认证后才能发布挂牌");
          }
          if (membershipLevel === "gold") {
            if (verificationStatus !== "approved") {
              throw new Error("黄金会员需通过实名认证后才能发布挂牌");
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayListings = await db.select().from(machineListings)
              .where(and(eq(machineListings.sellerUserId, ctx.user.id), gte(machineListings.createdAt, today)));
            if (todayListings.length >= 5) {
              throw new Error("黄金会员每天最多发布 5 条设备挂牌");
            }
          }
        }

        await db.insert(machineListings).values({
          sellerUserId: ctx.user.id,
          title: input.title,
          brand: input.brand,
          model: input.model,
          price: input.price !== undefined ? input.price.toString() : undefined,
          location: input.location,
          contactPhone: input.contactPhone,
          description: input.description,
          status: "pending",
        });

        return { success: true } as const;
      }),
  }),

  // 作业交易（正式运行）
  workOrders: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
    }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(workOrders).where(eq(workOrders.publisherUserId, ctx.user.id)).orderBy(desc(workOrders.createdAt));
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
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [userRow] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const membershipLevel = userRow?.membershipLevel ?? "free";
        const verificationStatus = userRow?.verificationStatus ?? "unsubmitted";
        const isAdmin = ctx.user.role === "admin";

        if (!isAdmin) {
          if (membershipLevel === "free") {
            throw new Error("免费版仅可浏览，请升级为白银会员或以上后发布作业需求");
          }
          if (membershipLevel === "silver" && verificationStatus !== "approved") {
            throw new Error("白银会员需通过实名认证后才能发布作业需求");
          }
          if (membershipLevel === "gold") {
            if (verificationStatus !== "approved") {
              throw new Error("黄金会员需通过实名认证后才能发布作业需求");
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = await db.select().from(workOrders)
              .where(and(eq(workOrders.publisherUserId, ctx.user.id), gte(workOrders.createdAt, today)));
            if (todayOrders.length >= 5) {
              throw new Error("黄金会员每天最多发布 5 条作业需求");
            }
          }
        }

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
          fixedPrice: input.priceType === "fixed" ? input.fixedPrice?.toString() : undefined,
          biddingStartPrice: input.priceType === "bidding" ? input.biddingStartPrice?.toString() : undefined,
          status: "open",
        });

        return { success: true };
      }),
  }),

  // 地块管理路由
  fields: router({
    // 获取所有地块
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(fields).orderBy(desc(fields.createdAt));
    }),

    // 获取单个地块详情
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(fields).where(eq(fields.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    // 创建地块
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

    // 更新地块
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        cropType: z.string().min(1).optional(),
        area: z.number().positive().optional(),
        status: z.enum(["idle", "working", "completed"]).optional(),
        harvestProgress: z.number().min(0).max(100).optional(),
        avgYield: z.number().optional(),
        avgMoisture: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        const updateData: Record<string, unknown> = {};
        if (input.name) updateData.name = input.name;
        if (input.cropType) updateData.cropType = input.cropType;
        if (input.area) updateData.area = input.area.toString();
        if (input.status) updateData.status = input.status;
        if (input.harvestProgress !== undefined) updateData.harvestProgress = input.harvestProgress.toString();
        if (input.avgYield !== undefined) updateData.avgYield = input.avgYield.toString();
        if (input.avgMoisture !== undefined) updateData.avgMoisture = input.avgMoisture.toString();
        
        await db.update(fields).set(updateData).where(eq(fields.id, input.id));
        return { success: true };
      }),

    // 删除地块
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.delete(fields).where(eq(fields.id, input.id));
        return { success: true };
      }),
  }),

  // 农机管理路由
  machines: router({
    // 获取所有农机
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machines).orderBy(desc(machines.createdAt));
    }),

    // 获取单个农机详情
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(machines).where(eq(machines.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    // 创建农机
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["harvester", "tractor", "seeder", "sprayer"]),
        model: z.string().optional(),
        licensePlate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        await db.insert(machines).values({
          name: input.name,
          type: input.type,
          model: input.model,
          licensePlate: input.licensePlate,
          ownerId: ctx.user.id,
        });
        
        return { success: true };
      }),

    // 更新农机状态
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["online", "offline", "maintenance"]).optional(),
        currentLat: z.number().optional(),
        currentLng: z.number().optional(),
        currentSpeed: z.number().optional(),
        fuelLevel: z.number().optional(),
        assignedFieldId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        const updateData: Record<string, unknown> = {};
        if (input.status) updateData.status = input.status;
        if (input.currentLat !== undefined) updateData.currentLat = input.currentLat.toString();
        if (input.currentLng !== undefined) updateData.currentLng = input.currentLng.toString();
        if (input.currentSpeed !== undefined) updateData.currentSpeed = input.currentSpeed.toString();
        if (input.fuelLevel !== undefined) updateData.fuelLevel = input.fuelLevel.toString();
        if (input.assignedFieldId !== undefined) updateData.assignedFieldId = input.assignedFieldId;
        
        await db.update(machines).set(updateData).where(eq(machines.id, input.id));
        return { success: true };
      }),
  }),

  // 文件存储路由
  files: router({
    // 获取文件列表
    list: protectedProcedure
      .input(z.object({
        category: z.enum(["field_image", "drone_image", "document", "report", "other"]).optional(),
        relatedFieldId: z.number().optional(),
        relatedMachineId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(files);
        // 基本查询，可以根据需要添加过滤条件
        return query.orderBy(desc(files.createdAt));
      }),

    // 上传文件（接收base64编码的文件数据）
    upload: protectedProcedure
      .input(z.object({
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        base64Data: z.string().min(1),
        category: z.enum(["field_image", "drone_image", "document", "report", "other"]).default("other"),
        relatedFieldId: z.number().optional(),
        relatedMachineId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        // 解码base64数据
        const buffer = Buffer.from(input.base64Data, "base64");
        const fileSize = buffer.length;
        
        // 生成唯一文件键
        const fileExt = input.filename.split(".").pop() || "";
        const uniqueId = nanoid(12);
        const fileKey = `uploads/${ctx.user.id}/${input.category}/${uniqueId}.${fileExt}`;
        
        // 上传到S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // 保存文件元数据到数据库
        await db.insert(files).values({
          filename: `${uniqueId}.${fileExt}`,
          originalName: input.filename,
          mimeType: input.mimeType,
          size: fileSize,
          fileKey,
          url,
          category: input.category,
          relatedFieldId: input.relatedFieldId,
          relatedMachineId: input.relatedMachineId,
          uploaderId: ctx.user.id,
        });
        
        return { success: true, url, fileKey };
      }),

    // 删除文件
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.delete(files).where(eq(files.id, input.id));
        return { success: true };
      }),
  }),

  // 作业记录路由
  workLogs: router({
    // 获取作业记录列表
    list: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        fieldId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(workLogs);
        
        if (input?.machineId) {
          query = query.where(eq(workLogs.machineId, input.machineId)) as typeof query;
        }
        if (input?.fieldId) {
          query = query.where(eq(workLogs.fieldId, input.fieldId)) as typeof query;
        }
        
        return query.orderBy(desc(workLogs.createdAt)).limit(input?.limit ?? 50);
      }),

    // 获取单个作业记录详情
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(workLogs).where(eq(workLogs.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    // 获取农机作业统计
    getStats: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        fieldId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalLogs: 0, totalWorkArea: 0, totalFuelConsumed: 0, totalWorkHours: 0 };
        
        let query = db.select().from(workLogs);
        
        if (input?.machineId) {
          query = query.where(eq(workLogs.machineId, input.machineId)) as typeof query;
        }
        if (input?.fieldId) {
          query = query.where(eq(workLogs.fieldId, input.fieldId)) as typeof query;
        }
        
        const logsResult = await query;
        const logs = Array.isArray(logsResult) ? logsResult : [];
        
        let totalWorkArea = 0;
        let totalFuelConsumed = 0;
        let totalWorkHours = 0;
        
        logs.forEach(log => {
          if (log.workArea) totalWorkArea += parseFloat(log.workArea);
          if (log.fuelConsumed) totalFuelConsumed += parseFloat(log.fuelConsumed);
          if (log.startTime && log.endTime) {
            const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
            totalWorkHours += hours;
          }
        });
        
        return {
          totalLogs: logs.length,
          totalWorkArea: Math.round(totalWorkArea * 100) / 100,
          totalFuelConsumed: Math.round(totalFuelConsumed * 100) / 100,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        };
      }),

    // 创建作业记录
    create: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        fieldId: z.number(),
        startTime: z.date(),
        endTime: z.date().optional(),
        workArea: z.number().optional(),
        totalYield: z.number().optional(),
        avgYield: z.number().optional(),
        avgMoisture: z.number().optional(),
        fuelConsumed: z.number().optional(),
        pathGeoJson: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        await db.insert(workLogs).values({
          machineId: input.machineId,
          fieldId: input.fieldId,
          startTime: input.startTime,
          endTime: input.endTime,
          workArea: input.workArea?.toString(),
          totalYield: input.totalYield?.toString(),
          avgYield: input.avgYield?.toString(),
          avgMoisture: input.avgMoisture?.toString(),
          fuelConsumed: input.fuelConsumed?.toString(),
          pathGeoJson: input.pathGeoJson,
        });
        
        return { success: true };
      }),

    // 更新作业记录
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        endTime: z.date().optional(),
        workArea: z.number().optional(),
        totalYield: z.number().optional(),
        avgYield: z.number().optional(),
        avgMoisture: z.number().optional(),
        fuelConsumed: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        const updateData: Record<string, unknown> = {};
        if (input.endTime) updateData.endTime = input.endTime;
        if (input.workArea !== undefined) updateData.workArea = input.workArea.toString();
        if (input.totalYield !== undefined) updateData.totalYield = input.totalYield.toString();
        if (input.avgYield !== undefined) updateData.avgYield = input.avgYield.toString();
        if (input.avgMoisture !== undefined) updateData.avgMoisture = input.avgMoisture.toString();
        if (input.fuelConsumed !== undefined) updateData.fuelConsumed = input.fuelConsumed.toString();
        
        await db.update(workLogs).set(updateData).where(eq(workLogs.id, input.id));
        return { success: true };
      }),

    // 删除作业记录
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.delete(workLogs).where(eq(workLogs.id, input.id));
        return { success: true };
      }),
  }),

  // 保养记录管理路由
  maintenance: router({
    // 获取保养记录列表
    listLogs: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(maintenanceLogs);
        
        if (input?.machineId) {
          query = query.where(eq(maintenanceLogs.machineId, input.machineId)) as typeof query;
        }
        
        return query.orderBy(desc(maintenanceLogs.maintenanceDate)).limit(input?.limit ?? 50);
      }),

    // 获取单个保养记录详情
    getLog: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    // 创建保养记录
    createLog: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        maintenanceType: z.enum(["routine", "repair", "inspection", "parts_replace"]),
        maintenanceDate: z.date(),
        engineHoursAtMaintenance: z.number().optional(),
        description: z.string().optional(),
        partsReplaced: z.string().optional(), // JSON string
        laborCost: z.number().optional(),
        partsCost: z.number().optional(),
        totalCost: z.number().optional(),
        technician: z.string().optional(),
        notes: z.string().optional(),
        nextMaintenanceHours: z.number().optional(),
        nextMaintenanceDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        await db.insert(maintenanceLogs).values({
          machineId: input.machineId,
          maintenanceType: input.maintenanceType,
          maintenanceDate: input.maintenanceDate,
          engineHoursAtMaintenance: input.engineHoursAtMaintenance?.toString(),
          description: input.description,
          partsReplaced: input.partsReplaced,
          laborCost: input.laborCost?.toString(),
          partsCost: input.partsCost?.toString(),
          totalCost: input.totalCost?.toString(),
          technician: input.technician,
          notes: input.notes,
          nextMaintenanceHours: input.nextMaintenanceHours?.toString(),
          nextMaintenanceDate: input.nextMaintenanceDate,
        });
        
        return { success: true };
      }),

    // 更新保养记录
    updateLog: protectedProcedure
      .input(z.object({
        id: z.number(),
        maintenanceType: z.enum(["routine", "repair", "inspection", "parts_replace"]).optional(),
        description: z.string().optional(),
        partsReplaced: z.string().optional(),
        laborCost: z.number().optional(),
        partsCost: z.number().optional(),
        totalCost: z.number().optional(),
        technician: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        const updateData: Record<string, unknown> = {};
        if (input.maintenanceType) updateData.maintenanceType = input.maintenanceType;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.partsReplaced !== undefined) updateData.partsReplaced = input.partsReplaced;
        if (input.laborCost !== undefined) updateData.laborCost = input.laborCost.toString();
        if (input.partsCost !== undefined) updateData.partsCost = input.partsCost.toString();
        if (input.totalCost !== undefined) updateData.totalCost = input.totalCost.toString();
        if (input.technician !== undefined) updateData.technician = input.technician;
        if (input.notes !== undefined) updateData.notes = input.notes;
        
        await db.update(maintenanceLogs).set(updateData).where(eq(maintenanceLogs.id, input.id));
        return { success: true };
      }),

    // 删除保养记录
    deleteLog: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.delete(maintenanceLogs).where(eq(maintenanceLogs.id, input.id));
        return { success: true };
      }),

    // 获取保养计划列表
    listPlans: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        status: z.enum(["pending", "due", "overdue", "completed"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(maintenancePlans);
        
        if (input?.machineId) {
          query = query.where(eq(maintenancePlans.machineId, input.machineId)) as typeof query;
        }
        if (input?.status) {
          query = query.where(eq(maintenancePlans.status, input.status)) as typeof query;
        }
        
        return query.orderBy(desc(maintenancePlans.priority));
      }),

    // 创建保养计划
    createPlan: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        planType: z.enum(["oil_change", "filter_replace", "belt_check", "brake_service", "hydraulic_service", "engine_overhaul", "general_service"]),
        intervalHours: z.number(),
        lastServiceHours: z.number().optional(),
        lastServiceDate: z.date().optional(),
        estimatedCost: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        // 计算下次保养工时
        const nextServiceHours = input.lastServiceHours 
          ? input.lastServiceHours + input.intervalHours 
          : input.intervalHours;
        
        await db.insert(maintenancePlans).values({
          machineId: input.machineId,
          planType: input.planType,
          intervalHours: input.intervalHours.toString(),
          lastServiceHours: input.lastServiceHours?.toString(),
          lastServiceDate: input.lastServiceDate,
          nextServiceHours: nextServiceHours.toString(),
          estimatedCost: input.estimatedCost?.toString(),
          notes: input.notes,
        });
        
        return { success: true };
      }),

    // 更新保养计划状态
    updatePlanStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "due", "overdue", "completed"]),
        lastServiceHours: z.number().optional(),
        lastServiceDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        
        const updateData: Record<string, unknown> = {
          status: input.status,
        };
        
        if (input.lastServiceHours !== undefined) {
          updateData.lastServiceHours = input.lastServiceHours.toString();
        }
        if (input.lastServiceDate) {
          updateData.lastServiceDate = input.lastServiceDate;
        }
        
        await db.update(maintenancePlans).set(updateData).where(eq(maintenancePlans.id, input.id));
        return { success: true };
      }),

    // 删除保养计划
    deletePlan: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");
        await db.delete(maintenancePlans).where(eq(maintenancePlans.id, input.id));
        return { success: true };
      }),

    // 获取设备保养统计
    getStats: publicProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalLogs: 0, totalCost: 0, avgCostPerService: 0, lastServiceDate: null };
        
        const logs = await db.select().from(maintenanceLogs)
          .where(eq(maintenanceLogs.machineId, input.machineId))
          .orderBy(desc(maintenanceLogs.maintenanceDate));
        
        let totalCost = 0;
        logs.forEach(log => {
          if (log.totalCost) totalCost += parseFloat(log.totalCost);
        });
        
        return {
          totalLogs: logs.length,
          totalCost: Math.round(totalCost * 100) / 100,
          avgCostPerService: logs.length > 0 ? Math.round((totalCost / logs.length) * 100) / 100 : 0,
          lastServiceDate: logs[0]?.maintenanceDate ?? null,
        };
      }),

    // 智能保养预测
    predictMaintenance: publicProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { predictions: [], healthScore: 100 };
        
        // 获取设备信息
        const machineResult = await db.select().from(machines)
          .where(eq(machines.id, input.machineId)).limit(1);
        const machine = machineResult[0];
        if (!machine) return { predictions: [], healthScore: 100 };
        
        const currentEngineHours = machine.engineHours ? parseFloat(machine.engineHours) : 0;
        
        // 获取保养计划
        const plans = await db.select().from(maintenancePlans)
          .where(eq(maintenancePlans.machineId, input.machineId));
        
        // 获取历史保养记录用于分析
        const logs = await db.select().from(maintenanceLogs)
          .where(eq(maintenanceLogs.machineId, input.machineId))
          .orderBy(desc(maintenanceLogs.maintenanceDate));
        
        // 计算平均每日工作时长（基于最近30天的数据估算）
        const avgDailyHours = 8; // 默认假设每天工作8小时，实际应从作业记录计算
        
        const predictions: Array<{
          planType: string;
          planTypeName: string;
          currentHours: number;
          nextServiceHours: number;
          remainingHours: number;
          predictedDate: string;
          urgency: string;
          estimatedCost: number;
        }> = [];
        
        const planTypeNames: Record<string, string> = {
          oil_change: "换机油",
          filter_replace: "更换滤芯",
          belt_check: "皮带检查",
          brake_service: "制动系统保养",
          hydraulic_service: "液压系统保养",
          engine_overhaul: "发动机大修",
          general_service: "综合保养",
        };
        
        plans.forEach(plan => {
          const nextServiceHours = plan.nextServiceHours ? parseFloat(plan.nextServiceHours) : 0;
          const remainingHours = nextServiceHours - currentEngineHours;
          const daysUntilService = remainingHours / avgDailyHours;
          
          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + Math.max(0, Math.round(daysUntilService)));
          
          let urgency = "low";
          if (remainingHours <= 0) urgency = "overdue";
          else if (remainingHours <= 50) urgency = "urgent";
          else if (remainingHours <= 100) urgency = "high";
          else if (remainingHours <= 200) urgency = "medium";
          
          predictions.push({
            planType: plan.planType,
            planTypeName: planTypeNames[plan.planType] || plan.planType,
            currentHours: currentEngineHours,
            nextServiceHours,
            remainingHours: Math.round(remainingHours * 10) / 10,
            predictedDate: predictedDate.toISOString().split("T")[0],
            urgency,
            estimatedCost: plan.estimatedCost ? parseFloat(plan.estimatedCost) : 0,
          });
        });
        
        // 计算设备健康评分（基于保养状态）
        let healthScore = 100;
        predictions.forEach(p => {
          if (p.urgency === "overdue") healthScore -= 25;
          else if (p.urgency === "urgent") healthScore -= 15;
          else if (p.urgency === "high") healthScore -= 10;
          else if (p.urgency === "medium") healthScore -= 5;
        });
        healthScore = Math.max(0, healthScore);
        
        // 按紧急程度排序
        const urgencyOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
        predictions.sort((a, b) => 
          (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 5) - 
          (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 5)
        );
        
        return { predictions, healthScore };
      }),
  }),
});

export type AppRouter = typeof appRouter;
