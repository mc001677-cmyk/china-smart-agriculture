/**
 * Admin 后台管理系统 - 专用路由
 * 
 * 所有接口均需要 Admin 权限验证
 */
import { adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { 
  users, 
  workOrders, 
  machineListings, 
  membershipOrders, 
  systemSettings,
  smsLogs,
  loginLogs,
  machines,
  fields
} from "../drizzle/schema";
import { eq, desc, gte, lte, and, or, like, sql, count } from "drizzle-orm";

/**
 * 会员权限矩阵定义
 * 用于前后端统一的权限控制
 */
export const MEMBERSHIP_PERMISSIONS = {
  free: {
    level: 0,
    name: "免费用户",
    permissions: {
      viewJobList: true,           // 查看作业需求列表
      viewJobContact: false,       // 查看作业需求联系方式
      publishJob: false,           // 发布作业需求
      viewMachineList: true,       // 查看二手机列表
      viewMachineContact: true,    // 查看二手机联系方式（公开）
      publishMachine: false,       // 发布二手机
      trajectoryReplay: false,     // 轨迹回放
      yieldAnalysis: false,        // 产量分析
      exportData: false,           // 导出数据
      maxDevices: 0,               // 最大设备数
    }
  },
  silver: {
    level: 1,
    name: "白银会员",
    price: 66,
    duration: 365, // 天
    permissions: {
      viewJobList: true,
      viewJobContact: true,        // ✅ 解锁
      publishJob: true,            // ✅ 解锁
      viewMachineList: true,
      viewMachineContact: true,
      publishMachine: true,        // ✅ 解锁
      trajectoryReplay: false,
      yieldAnalysis: false,
      exportData: false,
      maxDevices: 3,
    }
  },
  gold: {
    level: 2,
    name: "黄金会员",
    price: 199,
    duration: 365,
    permissions: {
      viewJobList: true,
      viewJobContact: true,
      publishJob: true,
      viewMachineList: true,
      viewMachineContact: true,
      publishMachine: true,
      trajectoryReplay: true,      // ✅ 解锁
      yieldAnalysis: true,         // ✅ 解锁
      exportData: true,            // ✅ 解锁
      maxDevices: 10,
    }
  },
  diamond: {
    level: 3,
    name: "钻石伙伴",
    price: null, // 需洽谈
    duration: null,
    permissions: {
      viewJobList: true,
      viewJobContact: true,
      publishJob: true,
      viewMachineList: true,
      viewMachineContact: true,
      publishMachine: true,
      trajectoryReplay: true,
      yieldAnalysis: true,
      exportData: true,
      maxDevices: -1,              // 无限制
      regionalAgent: true,         // 区域代理权限
      customReport: true,          // 定制报表
    }
  }
};

export const adminRouter = router({
  /**
   * Dashboard 统计数据
   */
  dashboard: router({
    // 获取总览统计
    stats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      // 用户统计
      const [userStats] = await db.select({
        total: count(),
        admins: sql<number>`SUM(CASE WHEN isAdmin = 1 THEN 1 ELSE 0 END)`,
        frozen: sql<number>`SUM(CASE WHEN status = 'frozen' THEN 1 ELSE 0 END)`,
      }).from(users);

      // 今日新增用户
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayUsers] = await db.select({ count: count() }).from(users)
        .where(gte(users.createdAt, today));

      // 会员等级分布
      const membershipStats = await db.select({
        level: users.membershipLevel,
        count: count(),
      }).from(users).groupBy(users.membershipLevel);

      // 作业需求统计
      const [jobStats] = await db.select({
        total: count(),
        open: sql<number>`SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        closed: sql<number>`SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)`,
      }).from(workOrders);

      // 二手机统计
      const [machineStats] = await db.select({
        total: count(),
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
      }).from(machineListings);

      // 会员订单统计
      const [orderStats] = await db.select({
        total: count(),
        totalAmount: sql<number>`SUM(CASE WHEN status = 'paid' THEN price ELSE 0 END)`,
        paid: sql<number>`SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      }).from(membershipOrders);

      // 最近7天注册趋势
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const registrationTrend = await db.select({
        date: sql<string>`DATE(createdAt)`,
        count: count(),
      }).from(users)
        .where(gte(users.createdAt, sevenDaysAgo))
        .groupBy(sql`DATE(createdAt)`)
        .orderBy(sql`DATE(createdAt)`);

      return {
        users: {
          total: userStats?.total || 0,
          admins: Number(userStats?.admins) || 0,
          frozen: Number(userStats?.frozen) || 0,
          todayNew: todayUsers?.count || 0,
        },
        membership: membershipStats.reduce((acc, item) => {
          acc[item.level] = item.count;
          return acc;
        }, {} as Record<string, number>),
        jobs: {
          total: jobStats?.total || 0,
          open: Number(jobStats?.open) || 0,
          pending: Number(jobStats?.pending) || 0,
          closed: Number(jobStats?.closed) || 0,
        },
        machines: {
          total: machineStats?.total || 0,
          pending: Number(machineStats?.pending) || 0,
          approved: Number(machineStats?.approved) || 0,
          rejected: Number(machineStats?.rejected) || 0,
        },
        orders: {
          total: orderStats?.total || 0,
          totalAmount: Number(orderStats?.totalAmount) || 0,
          paid: Number(orderStats?.paid) || 0,
          pending: Number(orderStats?.pending) || 0,
        },
        registrationTrend,
      };
    }),
  }),

  /**
   * 用户管理
   */
  users: router({
    // 用户列表（分页）
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        membershipLevel: z.enum(["free", "silver", "gold", "diamond"]).optional(),
        status: z.enum(["active", "frozen", "deleted"]).optional(),
        isAdmin: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.search) {
          conditions.push(or(
            like(users.phone, `%${input.search}%`),
            like(users.name, `%${input.search}%`),
            like(users.realName, `%${input.search}%`)
          ));
        }
        if (input.membershipLevel) {
          conditions.push(eq(users.membershipLevel, input.membershipLevel));
        }
        if (input.status) {
          conditions.push(eq(users.status, input.status));
        }
        if (input.isAdmin !== undefined) {
          conditions.push(eq(users.isAdmin, input.isAdmin ? 1 : 0));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(users).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select({
          id: users.id,
          phone: users.phone,
          name: users.name,
          realName: users.realName,
          organization: users.organization,
          membershipLevel: users.membershipLevel,
          membershipExpiresAt: users.membershipExpiresAt,
          isAdmin: users.isAdmin,
          status: users.status,
          verificationStatus: users.verificationStatus,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        }).from(users)
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          list,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    // 用户详情
    detail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!user) throw new Error("用户不存在");

        // 获取用户的订单数量
        const [orderCount] = await db.select({ count: count() }).from(membershipOrders)
          .where(eq(membershipOrders.userId, input.userId));

        // 获取用户发布的作业需求数量
        const [jobCount] = await db.select({ count: count() }).from(workOrders)
          .where(eq(workOrders.publisherUserId, input.userId));

        // 获取用户发布的二手机数量
        const [machineCount] = await db.select({ count: count() }).from(machineListings)
          .where(eq(machineListings.sellerUserId, input.userId));

        return {
          ...user,
          stats: {
            orders: orderCount?.count || 0,
            jobs: jobCount?.count || 0,
            machines: machineCount?.count || 0,
          }
        };
      }),

    // 设置/取消管理员
    setAdmin: adminProcedure
      .input(z.object({
        userId: z.number(),
        isAdmin: z.boolean(),
        adminRole: z.enum(["super_admin", "operation", "support"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        // 不能修改自己的管理员状态
        if (input.userId === ctx.user.id) {
          throw new Error("不能修改自己的管理员状态");
        }

        await db.update(users).set({
          isAdmin: input.isAdmin ? 1 : 0,
          adminRole: input.isAdmin ? (input.adminRole || "operation") : null,
        }).where(eq(users.id, input.userId));

        return { success: true };
      }),

    // 冻结/解冻账号
    setStatus: adminProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["active", "frozen"]),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        if (input.userId === ctx.user.id) {
          throw new Error("不能冻结自己的账号");
        }

        await db.update(users).set({
          status: input.status,
          frozenAt: input.status === "frozen" ? new Date() : null,
          frozenReason: input.status === "frozen" ? input.reason : null,
        }).where(eq(users.id, input.userId));

        return { success: true };
      }),

    // 手动修改会员等级
    setMembership: adminProcedure
      .input(z.object({
        userId: z.number(),
        level: z.enum(["free", "silver", "gold", "diamond"]),
        expiresAt: z.string().optional(), // ISO 日期字符串
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.update(users).set({
          membershipLevel: input.level,
          membershipExpiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          membershipSource: "admin_manual",
          membershipNote: input.note,
        }).where(eq(users.id, input.userId));

        return { success: true };
      }),
  }),

  /**
   * 作业需求管理
   */
  jobs: router({
    // 作业需求列表
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        status: z.enum(["open", "pending", "closed"]).optional(),
        cropType: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.status) {
          conditions.push(eq(workOrders.status, input.status));
        }
        if (input.cropType) {
          conditions.push(eq(workOrders.cropType, input.cropType));
        }
        if (input.search) {
          conditions.push(or(
            like(workOrders.fieldName, `%${input.search}%`),
            like(workOrders.contactName, `%${input.search}%`)
          ));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(workOrders).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select({
          id: workOrders.id,
          publisherUserId: workOrders.publisherUserId,
          workType: workOrders.workType,
          fieldName: workOrders.fieldName,
          area: workOrders.area,
          cropType: workOrders.cropType,
          priceType: workOrders.priceType,
          fixedPrice: workOrders.fixedPrice,
          status: workOrders.status,
          contactName: workOrders.contactName,
          contactPhone: workOrders.contactPhone,
          createdAt: workOrders.createdAt,
        }).from(workOrders)
          .where(whereClause)
          .orderBy(desc(workOrders.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          list,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    // 作业需求详情（Admin 可查看完整联系方式）
    detail: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [job] = await db.select().from(workOrders).where(eq(workOrders.id, input.jobId)).limit(1);
        if (!job) throw new Error("作业需求不存在");

        // 获取发布者信息
        const [publisher] = await db.select({
          id: users.id,
          name: users.name,
          phone: users.phone,
          membershipLevel: users.membershipLevel,
        }).from(users).where(eq(users.id, job.publisherUserId)).limit(1);

        return { ...job, publisher };
      }),

    // 修改作业需求状态
    setStatus: adminProcedure
      .input(z.object({
        jobId: z.number(),
        status: z.enum(["open", "pending", "closed"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.update(workOrders).set({
          status: input.status,
        }).where(eq(workOrders.id, input.jobId));

        return { success: true };
      }),
  }),

  /**
   * 二手机管理
   */
  machines: router({
    // 二手机列表
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.status) {
          conditions.push(eq(machineListings.status, input.status));
        }
        if (input.search) {
          conditions.push(or(
            like(machineListings.title, `%${input.search}%`),
            like(machineListings.brand, `%${input.search}%`)
          ));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(machineListings).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select({
          id: machineListings.id,
          sellerUserId: machineListings.sellerUserId,
          title: machineListings.title,
          brand: machineListings.brand,
          model: machineListings.model,
          price: machineListings.price,
          location: machineListings.location,
          contactPhone: machineListings.contactPhone,
          status: machineListings.status,
          createdAt: machineListings.createdAt,
        }).from(machineListings)
          .where(whereClause)
          .orderBy(desc(machineListings.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          list,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    // 审核二手机
    review: adminProcedure
      .input(z.object({
        listingId: z.number(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        await db.update(machineListings).set({
          status: input.status,
          reviewedAt: new Date(),
          reviewerUserId: ctx.user.id,
          reviewNote: input.note,
        }).where(eq(machineListings.id, input.listingId));

        return { success: true };
      }),
  }),

  /**
   * 会员订单管理
   */
  memberships: router({
    // 订单列表
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        status: z.enum(["pending", "paid", "cancelled", "failed"]).optional(),
        userId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.status) {
          conditions.push(eq(membershipOrders.status, input.status));
        }
        if (input.userId) {
          conditions.push(eq(membershipOrders.userId, input.userId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(membershipOrders).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select().from(membershipOrders)
          .where(whereClause)
          .orderBy(desc(membershipOrders.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        // 获取用户信息
        const userIds = [...new Set(list.map(o => o.userId))];
        const userList = userIds.length > 0 
          ? await db.select({ id: users.id, phone: users.phone, name: users.name })
              .from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        const userMap = new Map(userList.map(u => [u.id, u]));

        return {
          list: list.map(order => ({
            ...order,
            user: userMap.get(order.userId),
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    // 手动标记订单状态
    setStatus: adminProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["paid", "cancelled"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [order] = await db.select().from(membershipOrders).where(eq(membershipOrders.id, input.orderId)).limit(1);
        if (!order) throw new Error("订单不存在");

        await db.update(membershipOrders).set({
          status: input.status,
          paidAt: input.status === "paid" ? new Date() : null,
          note: input.note,
        }).where(eq(membershipOrders.id, input.orderId));

        // 如果标记为已支付，更新用户会员等级
        if (input.status === "paid") {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          await db.update(users).set({
            membershipLevel: order.plan as any,
            membershipExpiresAt: expiresAt,
            membershipSource: "admin_manual",
          }).where(eq(users.id, order.userId));
        }

        return { success: true };
      }),
  }),

  /**
   * 日志管理
   */
  logs: router({
    // 短信日志
    sms: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
        phone: z.string().optional(),
        status: z.enum(["success", "failed"]).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.phone) {
          conditions.push(like(smsLogs.phone, `%${input.phone}%`));
        }
        if (input.status) {
          conditions.push(eq(smsLogs.status, input.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(smsLogs).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select().from(smsLogs)
          .where(whereClause)
          .orderBy(desc(smsLogs.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return { list, total, page: input.page, pageSize: input.pageSize };
      }),

    // 登录日志
    login: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
        userId: z.number().optional(),
        status: z.enum(["success", "failed"]).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const conditions = [];
        if (input.userId) {
          conditions.push(eq(loginLogs.userId, input.userId));
        }
        if (input.status) {
          conditions.push(eq(loginLogs.status, input.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult] = await db.select({ count: count() }).from(loginLogs).where(whereClause);
        const total = totalResult?.count || 0;

        const list = await db.select().from(loginLogs)
          .where(whereClause)
          .orderBy(desc(loginLogs.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return { list, total, page: input.page, pageSize: input.pageSize };
      }),
  }),

  /**
   * 系统配置
   */
  settings: router({
    // 获取所有配置
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const list = await db.select().from(systemSettings).orderBy(systemSettings.category);
      return list;
    }),

    // 获取单个配置
    get: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);
        return setting;
      }),

    // 更新配置
    set: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库不可用");

        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);

        if (existing) {
          await db.update(systemSettings).set({
            value: input.value,
            description: input.description,
            updatedBy: ctx.user.id,
          }).where(eq(systemSettings.key, input.key));
        } else {
          await db.insert(systemSettings).values({
            key: input.key,
            value: input.value,
            description: input.description,
            category: input.category,
            updatedBy: ctx.user.id,
          });
        }

        return { success: true };
      }),

    // 初始化默认配置
    initDefaults: adminProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const defaults = [
        { key: "membership_silver_price", value: "66", description: "白银会员年费（元）", category: "membership" },
        { key: "membership_gold_price", value: "199", description: "黄金会员年费（元）", category: "membership" },
        { key: "sms_enabled", value: "false", description: "是否启用真实短信服务", category: "sms" },
        { key: "sms_provider", value: "MOCK", description: "短信服务商（MOCK/ALIYUN/TENCENT）", category: "sms" },
        { key: "default_membership_level", value: "free", description: "新用户默认会员等级", category: "system" },
      ];

      for (const item of defaults) {
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, item.key)).limit(1);
        if (!existing) {
          await db.insert(systemSettings).values({
            ...item,
            updatedBy: ctx.user.id,
          });
        }
      }

      return { success: true };
    }),
  }),

  /**
   * 会员权限配置（只读）
   */
  permissions: router({
    // 获取会员权限矩阵
    matrix: adminProcedure.query(() => {
      return MEMBERSHIP_PERMISSIONS;
    }),
  }),
});

export type AdminRouter = typeof adminRouter;
