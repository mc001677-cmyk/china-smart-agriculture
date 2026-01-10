import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, bigint, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // 传统注册（手机号+密码）：OAuth 用户也可为空
  phone: varchar("phone", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  // 身份资料 + 审核（通过后才授予发布权限）
  realName: varchar("realName", { length: 64 }),
  organization: varchar("organization", { length: 128 }),
  identityIntro: text("identityIntro"),
  verificationStatus: mysqlEnum("verificationStatus", ["unsubmitted", "pending", "approved", "rejected"])
    .default("unsubmitted")
    .notNull(),
  verificationSubmittedAt: timestamp("verificationSubmittedAt"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
  verificationNote: text("verificationNote"),

  // 会员体系
  membershipLevel: mysqlEnum("membershipLevel", ["free", "silver", "gold", "diamond"]).default("free").notNull(),
  membershipExpiresAt: timestamp("membershipExpiresAt"),
  membershipSource: varchar("membershipSource", { length: 64 }),
  membershipNote: text("membershipNote"),
  devicesOwned: int("devicesOwned").default(0).notNull(),

  // 微信登录相关
  wechatOpenid: varchar("wechatOpenid", { length: 128 }).unique(),
  wechatUnionid: varchar("wechatUnionid", { length: 128 }).unique(),
  phoneVerified: int("phoneVerified").default(0).notNull(), // 0: 未验证, 1: 已验证

  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Admin 后台权限
  isAdmin: int("isAdmin").default(0).notNull(), // 0: 普通用户, 1: 管理员
  adminRole: mysqlEnum("adminRole", ["super_admin", "operation", "support"]), // 预留：管理员角色细分
  // 账号状态
  status: mysqlEnum("status", ["active", "frozen", "deleted"]).default("active").notNull(),
  frozenAt: timestamp("frozenAt"),
  frozenReason: text("frozenReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 地块表 - 存储农田地块信息
 */
export const fields = mysqlTable("fields", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  cropType: varchar("cropType", { length: 64 }).notNull(), // 作物类型：玉米、水稻、大豆等
  area: decimal("area", { precision: 10, scale: 2 }).notNull(), // 面积（亩）
  boundaryGeoJson: text("boundaryGeoJson"), // 地块边界GeoJSON
  centerLat: decimal("centerLat", { precision: 10, scale: 6 }), // 中心纬度
  centerLng: decimal("centerLng", { precision: 10, scale: 6 }), // 中心经度
  status: mysqlEnum("status", ["idle", "working", "completed"]).default("idle").notNull(),
  harvestProgress: decimal("harvestProgress", { precision: 5, scale: 2 }).default("0"), // 收割进度百分比
  avgYield: decimal("avgYield", { precision: 8, scale: 2 }), // 平均产量（kg/亩）
  avgMoisture: decimal("avgMoisture", { precision: 5, scale: 2 }), // 平均水分（%）
  ownerId: int("ownerId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Field = typeof fields.$inferSelect;
export type InsertField = typeof fields.$inferInsert;

/**
 * 农机表 - 存储农业机械信息
 */
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["harvester", "tractor", "seeder", "sprayer"]).notNull(),
  brand: varchar("brand", { length: 64 }), // 品牌：john_deere / case_ih / new_holland / claas / ...
  model: varchar("model", { length: 128 }), // 型号
  licensePlate: varchar("licensePlate", { length: 32 }), // 车牌号
  // 设备直连（D+A）：用于硬件/网关上报鉴权与绑定
  deviceId: varchar("deviceId", { length: 128 }), // 设备唯一ID（建议与上报 deviceId 一致）
  deviceSecret: varchar("deviceSecret", { length: 128 }), // HMAC secret（v0.1 简化：明文存储；后续可改为hash/密钥管理）
  firmwareVersion: varchar("firmwareVersion", { length: 64 }),
  status: mysqlEnum("status", ["online", "offline", "maintenance"]).default("offline").notNull(),
  currentLat: decimal("currentLat", { precision: 10, scale: 6 }), // 当前纬度
  currentLng: decimal("currentLng", { precision: 10, scale: 6 }), // 当前经度
  currentSpeed: decimal("currentSpeed", { precision: 5, scale: 2 }), // 当前速度（km/h）
  fuelLevel: decimal("fuelLevel", { precision: 5, scale: 2 }), // 油量百分比
  lastSeenAt: timestamp("lastSeenAt"),
  engineHours: decimal("engineHours", { precision: 10, scale: 2 }), // 发动机工作时长
  ownerId: int("ownerId").references(() => users.id),
  assignedFieldId: int("assignedFieldId").references(() => fields.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  deviceIdIdx: uniqueIndex("machines_deviceId_unique").on(t.deviceId),
}));

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * 遥测上报表 - 存储设备上报的原始遥测包（D+A 第一阶段）
 * 说明：v0.1 以“可追溯 + 可回放 + 可计算”为目标，先入库原始 payload，并抽取常用字段做索引/展示。
 */
export const machineTelemetry = mysqlTable("machineTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  machineId: int("machineId").references(() => machines.id),
  seq: int("seq").notNull(),
  sentAt: bigint("sentAt", { mode: "number" }).notNull(), // 设备发送时间（Unix ms）
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),

  // 抽取字段（用于地图/机队列表/告警规则）
  lat: decimal("lat", { precision: 10, scale: 6 }),
  lng: decimal("lng", { precision: 10, scale: 6 }),
  speedKph: decimal("speedKph", { precision: 6, scale: 2 }),
  headingDeg: decimal("headingDeg", { precision: 6, scale: 2 }),
  status: varchar("status", { length: 32 }), // working/moving/idle/offline...
  fuelPct: decimal("fuelPct", { precision: 5, scale: 2 }),
  defPct: decimal("defPct", { precision: 5, scale: 2 }),
  rpm: decimal("rpm", { precision: 8, scale: 2 }),
  loadPct: decimal("loadPct", { precision: 5, scale: 2 }),
  payloadJson: text("payloadJson").notNull(), // 原始 payload（JSON 字符串）
}, (t) => ({
  // 幂等：同一设备同一 seq 只允许一次（防重复/补传）
  deviceSeqUnique: uniqueIndex("machineTelemetry_device_seq_unique").on(t.deviceId, t.seq),
}));

export type MachineTelemetry = typeof machineTelemetry.$inferSelect;
export type InsertMachineTelemetry = typeof machineTelemetry.$inferInsert;

/**
 * 设备注册申请表 - 用户在正式运行中提交设备资料，等待管理员审核通过后入 machines 表
 */
export const machineApplications = mysqlTable("machineApplications", {
  id: int("id").autoincrement().primaryKey(),
  applicantUserId: int("applicantUserId").references(() => users.id).notNull(),
  brand: varchar("brand", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["harvester", "tractor", "seeder", "sprayer"]).notNull(),
  licensePlate: varchar("licensePlate", { length: 32 }),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  deviceSecret: varchar("deviceSecret", { length: 128 }), // 初期允许填写，后续建议后台发放
  description: text("description"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerUserId: int("reviewerUserId").references(() => users.id),
  reviewNote: text("reviewNote"),
}, (t) => ({
  deviceIdUnique: uniqueIndex("machineApplications_deviceId_unique").on(t.deviceId),
}));

export type MachineApplication = typeof machineApplications.$inferSelect;
export type InsertMachineApplication = typeof machineApplications.$inferInsert;

/**
 * 二手农机挂牌表 - 用户发布二手农机信息，管理员审核后展示
 */
export const machineListings = mysqlTable("machineListings", {
  id: int("id").autoincrement().primaryKey(),
  sellerUserId: int("sellerUserId").references(() => users.id).notNull(),

  title: varchar("title", { length: 256 }).notNull(),
  brand: varchar("brand", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }), // 元
  location: varchar("location", { length: 128 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  description: text("description"),

  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerUserId: int("reviewerUserId").references(() => users.id),
  reviewNote: text("reviewNote"),
});

export type MachineListing = typeof machineListings.$inferSelect;
export type InsertMachineListing = typeof machineListings.$inferInsert;

/**
 * 文件存储表 - 存储上传文件的元数据
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 256 }).notNull(),
  originalName: varchar("originalName", { length: 256 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(), // 文件大小（字节）
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3存储键
  url: text("url").notNull(), // 文件访问URL
  category: mysqlEnum("category", ["field_image", "drone_image", "document", "report", "other"]).default("other").notNull(),
  relatedFieldId: int("relatedFieldId").references(() => fields.id),
  relatedMachineId: int("relatedMachineId").references(() => machines.id),
  uploaderId: int("uploaderId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FileRecord = typeof files.$inferSelect;
export type InsertFileRecord = typeof files.$inferInsert;

/**
 * 作业记录表 - 存储农机作业历史
 */
export const workLogs = mysqlTable("workLogs", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  fieldId: int("fieldId").references(() => fields.id).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  workArea: decimal("workArea", { precision: 10, scale: 2 }), // 作业面积（亩）
  totalYield: decimal("totalYield", { precision: 12, scale: 2 }), // 总产量（kg）
  avgYield: decimal("avgYield", { precision: 8, scale: 2 }), // 平均产量（kg/亩）
  avgMoisture: decimal("avgMoisture", { precision: 5, scale: 2 }), // 平均水分（%）
  fuelConsumed: decimal("fuelConsumed", { precision: 8, scale: 2 }), // 油耗（升）
  pathGeoJson: text("pathGeoJson"), // 作业轨迹GeoJSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkLog = typeof workLogs.$inferSelect;
export type InsertWorkLog = typeof workLogs.$inferInsert;

/**
 * 保养记录表 - 存储设备保养历史台账
 */
export const maintenanceLogs = mysqlTable("maintenanceLogs", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  maintenanceType: mysqlEnum("maintenanceType", [
    "routine",      // 常规保养
    "repair",       // 维修
    "inspection",   // 检查
    "parts_replace" // 配件更换
  ]).notNull(),
  maintenanceDate: timestamp("maintenanceDate").notNull(),
  engineHoursAtMaintenance: decimal("engineHoursAtMaintenance", { precision: 10, scale: 2 }), // 保养时的发动机工时
  description: text("description"), // 保养描述
  partsReplaced: text("partsReplaced"), // 更换的配件（JSON格式）
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }), // 人工费用
  partsCost: decimal("partsCost", { precision: 10, scale: 2 }), // 配件费用
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }), // 总费用
  technician: varchar("technician", { length: 64 }), // 维修技师
  notes: text("notes"), // 备注
  nextMaintenanceHours: decimal("nextMaintenanceHours", { precision: 10, scale: 2 }), // 下次保养工时
  nextMaintenanceDate: timestamp("nextMaintenanceDate"), // 建议下次保养日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type InsertMaintenanceLog = typeof maintenanceLogs.$inferInsert;

/**
 * 保养计划表 - 存储设备保养计划和预测
 */
export const maintenancePlans = mysqlTable("maintenancePlans", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  planType: mysqlEnum("planType", [
    "oil_change",       // 换机油
    "filter_replace",   // 更换滤芯
    "belt_check",       // 皮带检查
    "brake_service",    // 制动系统保养
    "hydraulic_service",// 液压系统保养
    "engine_overhaul",  // 发动机大修
    "general_service"   // 综合保养
  ]).notNull(),
  intervalHours: decimal("intervalHours", { precision: 10, scale: 2 }).notNull(), // 保养间隔工时
  lastServiceHours: decimal("lastServiceHours", { precision: 10, scale: 2 }), // 上次保养工时
  lastServiceDate: timestamp("lastServiceDate"), // 上次保养日期
  nextServiceHours: decimal("nextServiceHours", { precision: 10, scale: 2 }), // 下次保养工时
  predictedNextDate: timestamp("predictedNextDate"), // 预测下次保养日期
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "due", "overdue", "completed"]).default("pending").notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }), // 预估费用
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type InsertMaintenancePlan = typeof maintenancePlans.$inferInsert;

/**
 * 会员订单表 - 记录会员购买/设备捆绑订单，用于升级会员
 */
export const membershipOrders = mysqlTable("membershipOrders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  plan: mysqlEnum("plan", ["silver", "gold", "device_bundle", "diamond"]).notNull(),
  deviceCount: int("deviceCount").default(0).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "cancelled", "failed"]).default("pending").notNull(),
  paymentChannel: varchar("paymentChannel", { length: 64 }), // manual / wechat / alipay / other
  outTradeNo: varchar("outTradeNo", { length: 128 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  note: text("note"),
});

export type MembershipOrder = typeof membershipOrders.$inferSelect;
export type InsertMembershipOrder = typeof membershipOrders.$inferInsert;

/**
 * 钻石会员申请表 - 区域代理洽谈
 */
export const diamondApplications = mysqlTable("diamondApplications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  region: varchar("region", { length: 128 }),
  organization: varchar("organization", { length: 128 }),
  contact: varchar("contact", { length: 64 }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerUserId: int("reviewerUserId").references(() => users.id),
  reviewNote: text("reviewNote"),
});

export type DiamondApplication = typeof diamondApplications.$inferSelect;
export type InsertDiamondApplication = typeof diamondApplications.$inferInsert;

/**
 * 作业交易订单表 - 正式运行下的真实发布
 */
export const workOrders = mysqlTable("workOrders", {
  id: int("id").autoincrement().primaryKey(),
  publisherUserId: int("publisherUserId").references(() => users.id).notNull(),
  workType: varchar("workType", { length: 64 }).notNull(),
  fieldName: varchar("fieldName", { length: 128 }).notNull(),
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  cropType: varchar("cropType", { length: 64 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  preferredTime: varchar("preferredTime", { length: 32 }),
  priceType: mysqlEnum("priceType", ["fixed", "bidding"]).notNull(),
  fixedPrice: decimal("fixedPrice", { precision: 10, scale: 2 }),
  biddingStartPrice: decimal("biddingStartPrice", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["open", "pending", "closed"]).default("open").notNull(),
  contactName: varchar("contactName", { length: 64 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  contactWechat: varchar("contactWechat", { length: 64 }),
  contactAddress: text("contactAddress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * 验证码存储表 - 用于手机号验证码校验
 */
export const verificationCodes = mysqlTable("verificationCodes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  scene: varchar("scene", { length: 32 }).notNull(), // register, login, resetPassword, bindPhone
  codeHash: varchar("codeHash", { length: 256 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  isUsed: int("isUsed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  phoneSceneIdx: uniqueIndex("verificationCodes_phone_scene_idx").on(t.phone, t.scene, t.createdAt),
}));

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

/**
 * 系统配置表 - 键值对形式存储系统配置
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  description: varchar("description", { length: 256 }),
  category: varchar("category", { length: 64 }), // membership, sms, system
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * 短信发送日志表 - 记录所有短信发送记录
 */
export const smsLogs = mysqlTable("smsLogs", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  scene: varchar("scene", { length: 32 }).notNull(), // register, login, resetPassword, bindPhone
  provider: varchar("provider", { length: 32 }).notNull(), // MOCK, ALIYUN, TENCENT
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  errorMessage: text("errorMessage"),
  requestId: varchar("requestId", { length: 128 }), // 服务商返回的请求ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = typeof smsLogs.$inferInsert;

/**
 * 登录日志表 - 记录用户登录行为
 */
export const loginLogs = mysqlTable("loginLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  loginMethod: varchar("loginMethod", { length: 32 }).notNull(), // phone, wechat, oauth
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("userAgent"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;
