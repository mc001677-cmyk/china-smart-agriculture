// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, bigint, uniqueIndex } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  verificationStatus: mysqlEnum("verificationStatus", ["unsubmitted", "pending", "approved", "rejected"]).default("unsubmitted").notNull(),
  verificationSubmittedAt: timestamp("verificationSubmittedAt"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
  verificationNote: text("verificationNote"),
  // 会员体系
  membershipLevel: mysqlEnum("membershipLevel", ["free", "silver", "gold", "diamond"]).default("free").notNull(),
  membershipExpiresAt: timestamp("membershipExpiresAt"),
  membershipSource: varchar("membershipSource", { length: 64 }),
  membershipNote: text("membershipNote"),
  devicesOwned: int("devicesOwned").default(0).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var fields = mysqlTable("fields", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  cropType: varchar("cropType", { length: 64 }).notNull(),
  // 作物类型：玉米、水稻、大豆等
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  // 面积（亩）
  boundaryGeoJson: text("boundaryGeoJson"),
  // 地块边界GeoJSON
  centerLat: decimal("centerLat", { precision: 10, scale: 6 }),
  // 中心纬度
  centerLng: decimal("centerLng", { precision: 10, scale: 6 }),
  // 中心经度
  status: mysqlEnum("status", ["idle", "working", "completed"]).default("idle").notNull(),
  harvestProgress: decimal("harvestProgress", { precision: 5, scale: 2 }).default("0"),
  // 收割进度百分比
  avgYield: decimal("avgYield", { precision: 8, scale: 2 }),
  // 平均产量（kg/亩）
  avgMoisture: decimal("avgMoisture", { precision: 5, scale: 2 }),
  // 平均水分（%）
  ownerId: int("ownerId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["harvester", "tractor", "seeder", "sprayer"]).notNull(),
  brand: varchar("brand", { length: 64 }),
  // 品牌：john_deere / case_ih / new_holland / claas / ...
  model: varchar("model", { length: 128 }),
  // 型号
  licensePlate: varchar("licensePlate", { length: 32 }),
  // 车牌号
  // 设备直连（D+A）：用于硬件/网关上报鉴权与绑定
  deviceId: varchar("deviceId", { length: 128 }),
  // 设备唯一ID（建议与上报 deviceId 一致）
  deviceSecret: varchar("deviceSecret", { length: 128 }),
  // HMAC secret（v0.1 简化：明文存储；后续可改为hash/密钥管理）
  firmwareVersion: varchar("firmwareVersion", { length: 64 }),
  status: mysqlEnum("status", ["online", "offline", "maintenance"]).default("offline").notNull(),
  currentLat: decimal("currentLat", { precision: 10, scale: 6 }),
  // 当前纬度
  currentLng: decimal("currentLng", { precision: 10, scale: 6 }),
  // 当前经度
  currentSpeed: decimal("currentSpeed", { precision: 5, scale: 2 }),
  // 当前速度（km/h）
  fuelLevel: decimal("fuelLevel", { precision: 5, scale: 2 }),
  // 油量百分比
  lastSeenAt: timestamp("lastSeenAt"),
  engineHours: decimal("engineHours", { precision: 10, scale: 2 }),
  // 发动机工作时长
  ownerId: int("ownerId").references(() => users.id),
  assignedFieldId: int("assignedFieldId").references(() => fields.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (t2) => ({
  deviceIdIdx: uniqueIndex("machines_deviceId_unique").on(t2.deviceId)
}));
var machineTelemetry = mysqlTable("machineTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  machineId: int("machineId").references(() => machines.id),
  seq: int("seq").notNull(),
  sentAt: bigint("sentAt", { mode: "number" }).notNull(),
  // 设备发送时间（Unix ms）
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  // 抽取字段（用于地图/机队列表/告警规则）
  lat: decimal("lat", { precision: 10, scale: 6 }),
  lng: decimal("lng", { precision: 10, scale: 6 }),
  speedKph: decimal("speedKph", { precision: 6, scale: 2 }),
  headingDeg: decimal("headingDeg", { precision: 6, scale: 2 }),
  status: varchar("status", { length: 32 }),
  // working/moving/idle/offline...
  fuelPct: decimal("fuelPct", { precision: 5, scale: 2 }),
  defPct: decimal("defPct", { precision: 5, scale: 2 }),
  rpm: decimal("rpm", { precision: 8, scale: 2 }),
  loadPct: decimal("loadPct", { precision: 5, scale: 2 }),
  payloadJson: text("payloadJson").notNull()
  // 原始 payload（JSON 字符串）
}, (t2) => ({
  // 幂等：同一设备同一 seq 只允许一次（防重复/补传）
  deviceSeqUnique: uniqueIndex("machineTelemetry_device_seq_unique").on(t2.deviceId, t2.seq)
}));
var machineApplications = mysqlTable("machineApplications", {
  id: int("id").autoincrement().primaryKey(),
  applicantUserId: int("applicantUserId").references(() => users.id).notNull(),
  brand: varchar("brand", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["harvester", "tractor", "seeder", "sprayer"]).notNull(),
  licensePlate: varchar("licensePlate", { length: 32 }),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  deviceSecret: varchar("deviceSecret", { length: 128 }),
  // 初期允许填写，后续建议后台发放
  description: text("description"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerUserId: int("reviewerUserId").references(() => users.id),
  reviewNote: text("reviewNote")
}, (t2) => ({
  deviceIdUnique: uniqueIndex("machineApplications_deviceId_unique").on(t2.deviceId)
}));
var machineListings = mysqlTable("machineListings", {
  id: int("id").autoincrement().primaryKey(),
  sellerUserId: int("sellerUserId").references(() => users.id).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  brand: varchar("brand", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }),
  // 元
  location: varchar("location", { length: 128 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerUserId: int("reviewerUserId").references(() => users.id),
  reviewNote: text("reviewNote")
});
var files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 256 }).notNull(),
  originalName: varchar("originalName", { length: 256 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  // 文件大小（字节）
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  // S3存储键
  url: text("url").notNull(),
  // 文件访问URL
  category: mysqlEnum("category", ["field_image", "drone_image", "document", "report", "other"]).default("other").notNull(),
  relatedFieldId: int("relatedFieldId").references(() => fields.id),
  relatedMachineId: int("relatedMachineId").references(() => machines.id),
  uploaderId: int("uploaderId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var workLogs = mysqlTable("workLogs", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  fieldId: int("fieldId").references(() => fields.id).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  workArea: decimal("workArea", { precision: 10, scale: 2 }),
  // 作业面积（亩）
  totalYield: decimal("totalYield", { precision: 12, scale: 2 }),
  // 总产量（kg）
  avgYield: decimal("avgYield", { precision: 8, scale: 2 }),
  // 平均产量（kg/亩）
  avgMoisture: decimal("avgMoisture", { precision: 5, scale: 2 }),
  // 平均水分（%）
  fuelConsumed: decimal("fuelConsumed", { precision: 8, scale: 2 }),
  // 油耗（升）
  pathGeoJson: text("pathGeoJson"),
  // 作业轨迹GeoJSON
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var maintenanceLogs = mysqlTable("maintenanceLogs", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  maintenanceType: mysqlEnum("maintenanceType", [
    "routine",
    // 常规保养
    "repair",
    // 维修
    "inspection",
    // 检查
    "parts_replace"
    // 配件更换
  ]).notNull(),
  maintenanceDate: timestamp("maintenanceDate").notNull(),
  engineHoursAtMaintenance: decimal("engineHoursAtMaintenance", { precision: 10, scale: 2 }),
  // 保养时的发动机工时
  description: text("description"),
  // 保养描述
  partsReplaced: text("partsReplaced"),
  // 更换的配件（JSON格式）
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }),
  // 人工费用
  partsCost: decimal("partsCost", { precision: 10, scale: 2 }),
  // 配件费用
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  // 总费用
  technician: varchar("technician", { length: 64 }),
  // 维修技师
  notes: text("notes"),
  // 备注
  nextMaintenanceHours: decimal("nextMaintenanceHours", { precision: 10, scale: 2 }),
  // 下次保养工时
  nextMaintenanceDate: timestamp("nextMaintenanceDate"),
  // 建议下次保养日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var maintenancePlans = mysqlTable("maintenancePlans", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").references(() => machines.id).notNull(),
  planType: mysqlEnum("planType", [
    "oil_change",
    // 换机油
    "filter_replace",
    // 更换滤芯
    "belt_check",
    // 皮带检查
    "brake_service",
    // 制动系统保养
    "hydraulic_service",
    // 液压系统保养
    "engine_overhaul",
    // 发动机大修
    "general_service"
    // 综合保养
  ]).notNull(),
  intervalHours: decimal("intervalHours", { precision: 10, scale: 2 }).notNull(),
  // 保养间隔工时
  lastServiceHours: decimal("lastServiceHours", { precision: 10, scale: 2 }),
  // 上次保养工时
  lastServiceDate: timestamp("lastServiceDate"),
  // 上次保养日期
  nextServiceHours: decimal("nextServiceHours", { precision: 10, scale: 2 }),
  // 下次保养工时
  predictedNextDate: timestamp("predictedNextDate"),
  // 预测下次保养日期
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "due", "overdue", "completed"]).default("pending").notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }),
  // 预估费用
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var membershipOrders = mysqlTable("membershipOrders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  plan: mysqlEnum("plan", ["silver", "gold", "device_bundle", "diamond"]).notNull(),
  deviceCount: int("deviceCount").default(0).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "cancelled", "failed"]).default("pending").notNull(),
  paymentChannel: varchar("paymentChannel", { length: 64 }),
  // manual / wechat / alipay / other
  outTradeNo: varchar("outTradeNo", { length: 128 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  note: text("note")
});
var diamondApplications = mysqlTable("diamondApplications", {
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
  reviewNote: text("reviewNote")
});
var workOrders = mysqlTable("workOrders", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/localAuth.ts
import crypto from "crypto";
import { z } from "zod";
import { eq as eq2 } from "drizzle-orm";
var RegisterSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(64)
});
var LoginSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128)
});
function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").replace(/^\+86/, "");
}
function makeOpenIdFromPhone(phone) {
  return `phone:${phone}`;
}
function scryptHash(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verifyScrypt(password, stored) {
  try {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    const expected = Buffer.from(hashHex, "hex");
    const got = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}
async function setSessionCookie(req, res, openId, name) {
  const sessionToken = await sdk.signSession({
    openId,
    appId: ENV.appId || "local",
    name: name || "user"
  }, { expiresInMs: ONE_YEAR_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}
function registerLocalAuthRoutes(app) {
  app.post("/api/auth/register", async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });
    const phone = normalizePhone(parsed.data.phone);
    const openId = makeOpenIdFromPhone(phone);
    const passwordHash = scryptHash(parsed.data.password);
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
    const exists = await db.select().from(users).where(eq2(users.openId, openId)).limit(1);
    if (exists[0]) return res.status(409).json({ ok: false, error: "already_registered" });
    await db.insert(users).values({
      openId,
      name: parsed.data.name,
      phone,
      passwordHash,
      loginMethod: "phone",
      role: "user",
      verificationStatus: "unsubmitted",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    await setSessionCookie(req, res, openId, parsed.data.name);
    return res.json({ ok: true });
  });
  app.post("/api/auth/login", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });
    const phone = normalizePhone(parsed.data.phone);
    const openId = makeOpenIdFromPhone(phone);
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
    const found = await db.select().from(users).where(eq2(users.openId, openId)).limit(1);
    const user = found[0];
    if (!user || !user.passwordHash) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    if (!verifyScrypt(parsed.data.password, user.passwordHash)) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
    await setSessionCookie(req, res, user.openId, user.name || "user");
    return res.json({ ok: true });
  });
}

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z3 } from "zod";

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers.ts
import { nanoid } from "nanoid";
import { eq as eq3, desc, gte, and } from "drizzle-orm";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // 注册/审核中心（正式运行）
  onboarding: router({
    // 提交身份介绍（提交后进入 pending，等待人工审核）
    submitIdentity: protectedProcedure.input(z3.object({
      realName: z3.string().min(1).max(64),
      organization: z3.string().min(1).max(128),
      intro: z3.string().min(10).max(2e3)
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(users).set({
        realName: input.realName,
        organization: input.organization,
        identityIntro: input.intro,
        verificationStatus: "pending",
        verificationSubmittedAt: /* @__PURE__ */ new Date(),
        verificationReviewedAt: null,
        verificationNote: null
      }).where(eq3(users.id, ctx.user.id));
      return { success: true };
    }),
    // 提交设备注册申请（待审核）
    submitMachineApplication: protectedProcedure.input(z3.object({
      brand: z3.string().min(1).max(64),
      model: z3.string().min(1).max(128),
      type: z3.enum(["harvester", "tractor", "seeder", "sprayer"]),
      licensePlate: z3.string().max(32).optional(),
      deviceId: z3.string().min(3).max(128),
      deviceSecret: z3.string().max(128).optional(),
      description: z3.string().max(2e3).optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.insert(machineApplications).values({
        applicantUserId: ctx.user.id,
        brand: input.brand,
        model: input.model,
        type: input.type,
        licensePlate: input.licensePlate,
        deviceId: input.deviceId,
        deviceSecret: input.deviceSecret,
        description: input.description,
        status: "pending"
      });
      return { success: true };
    })
  }),
  // 管理员审核（授予发布权限）
  adminReview: router({
    listPending: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { users: [], machines: [], listings: [] };
      const pendingUsers = await db.select().from(users).where(eq3(users.verificationStatus, "pending")).orderBy(desc(users.verificationSubmittedAt));
      const pendingMachines = await db.select().from(machineApplications).where(eq3(machineApplications.status, "pending")).orderBy(desc(machineApplications.submittedAt));
      const pendingListings = await db.select().from(machineListings).where(eq3(machineListings.status, "pending")).orderBy(desc(machineListings.createdAt));
      return { users: pendingUsers, machines: pendingMachines, listings: pendingListings };
    }),
    approveUser: adminProcedure.input(z3.object({ userId: z3.number(), note: z3.string().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(users).set({
        verificationStatus: "approved",
        verificationReviewedAt: /* @__PURE__ */ new Date(),
        verificationNote: input.note ?? null
      }).where(eq3(users.id, input.userId));
      return { success: true };
    }),
    rejectUser: adminProcedure.input(z3.object({ userId: z3.number(), note: z3.string().min(1).max(2e3) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(users).set({
        verificationStatus: "rejected",
        verificationReviewedAt: /* @__PURE__ */ new Date(),
        verificationNote: input.note
      }).where(eq3(users.id, input.userId));
      return { success: true };
    }),
    approveMachine: adminProcedure.input(z3.object({ applicationId: z3.number(), note: z3.string().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const app = await db.select().from(machineApplications).where(eq3(machineApplications.id, input.applicationId)).limit(1);
      const row = app[0];
      if (!row) throw new Error("\u7533\u8BF7\u4E0D\u5B58\u5728");
      await db.insert(machines).values({
        name: `${row.brand} ${row.model}`,
        type: row.type,
        brand: row.brand,
        model: row.model,
        licensePlate: row.licensePlate,
        deviceId: row.deviceId,
        deviceSecret: row.deviceSecret,
        status: "offline",
        ownerId: row.applicantUserId
      });
      await db.update(machineApplications).set({
        status: "approved",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewerUserId: ctx.user.id,
        reviewNote: input.note ?? null
      }).where(eq3(machineApplications.id, input.applicationId));
      return { success: true };
    }),
    rejectMachine: adminProcedure.input(z3.object({ applicationId: z3.number(), note: z3.string().min(1).max(2e3) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(machineApplications).set({
        status: "rejected",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewerUserId: ctx.user.id,
        reviewNote: input.note
      }).where(eq3(machineApplications.id, input.applicationId));
      return { success: true };
    }),
    approveListing: adminProcedure.input(z3.object({ listingId: z3.number(), note: z3.string().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(machineListings).set({
        status: "approved",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewerUserId: ctx.user.id,
        reviewNote: input.note ?? null
      }).where(eq3(machineListings.id, input.listingId));
      return { success: true };
    }),
    rejectListing: adminProcedure.input(z3.object({ listingId: z3.number(), note: z3.string().min(1).max(2e3) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(machineListings).set({
        status: "rejected",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewerUserId: ctx.user.id,
        reviewNote: input.note
      }).where(eq3(machineListings.id, input.listingId));
      return { success: true };
    })
  }),
  // 会员 & 认证权益
  membership: router({
    // 获取会员状态 + 今日发布计数
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const [userRow] = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const todayListings = await db.select().from(machineListings).where(and(eq3(machineListings.sellerUserId, ctx.user.id), gte(machineListings.createdAt, today)));
      const todayOrders = await db.select().from(workOrders).where(and(eq3(workOrders.publisherUserId, ctx.user.id), gte(workOrders.createdAt, today)));
      return {
        membershipLevel: userRow?.membershipLevel ?? "free",
        membershipExpiresAt: userRow?.membershipExpiresAt,
        devicesOwned: userRow?.devicesOwned ?? 0,
        verificationStatus: userRow?.verificationStatus ?? "unsubmitted",
        todayListings: todayListings.length,
        todayWorkOrders: todayOrders.length
      };
    }),
    // 创建会员/设备订单（当前支付渠道占位，需线下或后续接入）
    createOrder: protectedProcedure.input(z3.object({
      plan: z3.enum(["silver", "gold", "device_bundle", "diamond"]),
      deviceCount: z3.number().int().min(0).default(0).optional(),
      paymentChannel: z3.string().max(64).optional(),
      note: z3.string().max(2e3).optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const deviceCount = input.deviceCount ?? 0;
      let price = 66;
      if (input.plan === "device_bundle") {
        price = 0;
      }
      if (input.plan === "gold") {
        price = 0;
      }
      const inserted = await db.insert(membershipOrders).values({
        userId: ctx.user.id,
        plan: input.plan,
        deviceCount,
        price: price.toString(),
        paymentChannel: input.paymentChannel ?? "manual",
        note: input.note
      });
      return { success: true, orderId: inserted?.insertId ?? null, paymentHint: "\u5F53\u524D\u672A\u63A5\u5165\u5728\u7EBF\u652F\u4ED8\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u786E\u8BA4\u6536\u6B3E\u540E\u7531\u7BA1\u7406\u5458\u6807\u8BB0\u5DF2\u652F\u4ED8" };
    }),
    // 管理员标记订单已支付并升级会员
    markPaid: adminProcedure.input(z3.object({
      orderId: z3.number(),
      note: z3.string().max(2e3).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const [order] = await db.select().from(membershipOrders).where(eq3(membershipOrders.id, input.orderId)).limit(1);
      if (!order) throw new Error("\u8BA2\u5355\u4E0D\u5B58\u5728");
      await db.update(membershipOrders).set({
        status: "paid",
        paidAt: /* @__PURE__ */ new Date(),
        note: input.note ?? order.note
      }).where(eq3(membershipOrders.id, input.orderId));
      const [user] = await db.select().from(users).where(eq3(users.id, order.userId)).limit(1);
      if (!user) throw new Error("\u7528\u6237\u4E0D\u5B58\u5728");
      const now = /* @__PURE__ */ new Date();
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
        verificationReviewedAt: nextLevel !== "free" ? /* @__PURE__ */ new Date() : user.verificationReviewedAt
      }).where(eq3(users.id, order.userId));
      return { success: true, nextLevel, devicesOwned, expiresAt: expires };
    }),
    // 钻石会员申请
    applyDiamond: protectedProcedure.input(z3.object({
      region: z3.string().min(2).max(128),
      organization: z3.string().max(128).optional(),
      contact: z3.string().max(64).optional(),
      message: z3.string().min(10).max(2e3)
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.insert(diamondApplications).values({
        userId: ctx.user.id,
        region: input.region,
        organization: input.organization,
        contact: input.contact,
        message: input.message,
        status: "pending"
      });
      return { success: true };
    }),
    // 管理员查看/审核钻石申请
    listDiamond: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(diamondApplications).orderBy(desc(diamondApplications.submittedAt));
    }),
    reviewDiamond: adminProcedure.input(z3.object({ id: z3.number(), approve: z3.boolean(), note: z3.string().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.update(diamondApplications).set({
        status: input.approve ? "approved" : "rejected",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewerUserId: ctx.user.id,
        reviewNote: input.note
      }).where(eq3(diamondApplications.id, input.id));
      if (input.approve) {
        const [app] = await db.select().from(diamondApplications).where(eq3(diamondApplications.id, input.id)).limit(1);
        if (app) {
          await db.update(users).set({
            membershipLevel: "diamond",
            membershipExpiresAt: null,
            // 钻石以合同约定为准
            membershipSource: "diamond",
            membershipNote: input.note,
            verificationStatus: "approved",
            verificationReviewedAt: /* @__PURE__ */ new Date()
          }).where(eq3(users.id, app.userId));
        }
      }
      return { success: true };
    })
  }),
  // 二手农机挂牌
  machineListings: router({
    // 前台展示：仅返回已审核通过的挂牌
    listApproved: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machineListings).where(eq3(machineListings.status, "approved")).orderBy(desc(machineListings.createdAt));
    }),
    // 提交挂牌：仅审核通过用户（或管理员）可发布
    submit: protectedProcedure.input(z3.object({
      title: z3.string().min(1).max(256),
      brand: z3.string().min(1).max(64),
      model: z3.string().min(1).max(128),
      price: z3.number().nonnegative().optional(),
      location: z3.string().max(128).optional(),
      contactPhone: z3.string().max(32).optional(),
      description: z3.string().max(5e3).optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const userRow = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
      const user = userRow[0];
      const membershipLevel = user?.membershipLevel ?? "free";
      const verificationStatus = user?.verificationStatus ?? "unsubmitted";
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        if (membershipLevel === "free") {
          throw new Error("\u672A\u5F00\u901A\u53D1\u5E03\u6743\u9650\uFF1A\u8BF7\u5148\u5347\u7EA7\u4E3A\u767D\u94F6\u4F1A\u5458\u6216\u4EE5\u4E0A");
        }
        if (membershipLevel === "silver" && verificationStatus !== "approved") {
          throw new Error("\u767D\u94F6\u4F1A\u5458\u9700\u901A\u8FC7\u5B9E\u540D\u8BA4\u8BC1\u540E\u624D\u80FD\u53D1\u5E03\u6302\u724C");
        }
        if (membershipLevel === "gold") {
          if (verificationStatus !== "approved") {
            throw new Error("\u9EC4\u91D1\u4F1A\u5458\u9700\u901A\u8FC7\u5B9E\u540D\u8BA4\u8BC1\u540E\u624D\u80FD\u53D1\u5E03\u6302\u724C");
          }
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const todayListings = await db.select().from(machineListings).where(and(eq3(machineListings.sellerUserId, ctx.user.id), gte(machineListings.createdAt, today)));
          if (todayListings.length >= 5) {
            throw new Error("\u9EC4\u91D1\u4F1A\u5458\u6BCF\u5929\u6700\u591A\u53D1\u5E03 5 \u6761\u8BBE\u5907\u6302\u724C");
          }
        }
      }
      await db.insert(machineListings).values({
        sellerUserId: ctx.user.id,
        title: input.title,
        brand: input.brand,
        model: input.model,
        price: input.price !== void 0 ? input.price.toString() : void 0,
        location: input.location,
        contactPhone: input.contactPhone,
        description: input.description,
        status: "pending"
      });
      return { success: true };
    })
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
      return db.select().from(workOrders).where(eq3(workOrders.publisherUserId, ctx.user.id)).orderBy(desc(workOrders.createdAt));
    }),
    submit: protectedProcedure.input(z3.object({
      workType: z3.string().min(1).max(64),
      fieldName: z3.string().min(1).max(128),
      area: z3.number().positive(),
      cropType: z3.string().min(1).max(64),
      description: z3.string().max(5e3).optional(),
      startDate: z3.date(),
      endDate: z3.date().optional(),
      preferredTime: z3.string().max(32).optional(),
      priceType: z3.enum(["fixed", "bidding"]),
      fixedPrice: z3.number().nonnegative().optional(),
      biddingStartPrice: z3.number().nonnegative().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const [userRow] = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
      const membershipLevel = userRow?.membershipLevel ?? "free";
      const verificationStatus = userRow?.verificationStatus ?? "unsubmitted";
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        if (membershipLevel === "free") {
          throw new Error("\u514D\u8D39\u7248\u4EC5\u53EF\u6D4F\u89C8\uFF0C\u8BF7\u5347\u7EA7\u4E3A\u767D\u94F6\u4F1A\u5458\u6216\u4EE5\u4E0A\u540E\u53D1\u5E03\u4F5C\u4E1A\u9700\u6C42");
        }
        if (membershipLevel === "silver" && verificationStatus !== "approved") {
          throw new Error("\u767D\u94F6\u4F1A\u5458\u9700\u901A\u8FC7\u5B9E\u540D\u8BA4\u8BC1\u540E\u624D\u80FD\u53D1\u5E03\u4F5C\u4E1A\u9700\u6C42");
        }
        if (membershipLevel === "gold") {
          if (verificationStatus !== "approved") {
            throw new Error("\u9EC4\u91D1\u4F1A\u5458\u9700\u901A\u8FC7\u5B9E\u540D\u8BA4\u8BC1\u540E\u624D\u80FD\u53D1\u5E03\u4F5C\u4E1A\u9700\u6C42");
          }
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const todayOrders = await db.select().from(workOrders).where(and(eq3(workOrders.publisherUserId, ctx.user.id), gte(workOrders.createdAt, today)));
          if (todayOrders.length >= 5) {
            throw new Error("\u9EC4\u91D1\u4F1A\u5458\u6BCF\u5929\u6700\u591A\u53D1\u5E03 5 \u6761\u4F5C\u4E1A\u9700\u6C42");
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
        fixedPrice: input.priceType === "fixed" ? input.fixedPrice?.toString() : void 0,
        biddingStartPrice: input.priceType === "bidding" ? input.biddingStartPrice?.toString() : void 0,
        status: "open"
      });
      return { success: true };
    })
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
    get: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(fields).where(eq3(fields.id, input.id)).limit(1);
      return result[0] ?? null;
    }),
    // 创建地块
    create: protectedProcedure.input(z3.object({
      name: z3.string().min(1),
      cropType: z3.string().min(1),
      area: z3.number().positive(),
      boundaryGeoJson: z3.string().optional(),
      centerLat: z3.number().optional(),
      centerLng: z3.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.insert(fields).values({
        name: input.name,
        cropType: input.cropType,
        area: input.area.toString(),
        boundaryGeoJson: input.boundaryGeoJson,
        centerLat: input.centerLat?.toString(),
        centerLng: input.centerLng?.toString(),
        ownerId: ctx.user.id
      });
      return { success: true };
    }),
    // 更新地块
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      name: z3.string().min(1).optional(),
      cropType: z3.string().min(1).optional(),
      area: z3.number().positive().optional(),
      status: z3.enum(["idle", "working", "completed"]).optional(),
      harvestProgress: z3.number().min(0).max(100).optional(),
      avgYield: z3.number().optional(),
      avgMoisture: z3.number().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const updateData = {};
      if (input.name) updateData.name = input.name;
      if (input.cropType) updateData.cropType = input.cropType;
      if (input.area) updateData.area = input.area.toString();
      if (input.status) updateData.status = input.status;
      if (input.harvestProgress !== void 0) updateData.harvestProgress = input.harvestProgress.toString();
      if (input.avgYield !== void 0) updateData.avgYield = input.avgYield.toString();
      if (input.avgMoisture !== void 0) updateData.avgMoisture = input.avgMoisture.toString();
      await db.update(fields).set(updateData).where(eq3(fields.id, input.id));
      return { success: true };
    }),
    // 删除地块
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.delete(fields).where(eq3(fields.id, input.id));
      return { success: true };
    })
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
    get: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(machines).where(eq3(machines.id, input.id)).limit(1);
      return result[0] ?? null;
    }),
    // 创建农机
    create: protectedProcedure.input(z3.object({
      name: z3.string().min(1),
      type: z3.enum(["harvester", "tractor", "seeder", "sprayer"]),
      model: z3.string().optional(),
      licensePlate: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.insert(machines).values({
        name: input.name,
        type: input.type,
        model: input.model,
        licensePlate: input.licensePlate,
        ownerId: ctx.user.id
      });
      return { success: true };
    }),
    // 更新农机状态
    updateStatus: protectedProcedure.input(z3.object({
      id: z3.number(),
      status: z3.enum(["online", "offline", "maintenance"]).optional(),
      currentLat: z3.number().optional(),
      currentLng: z3.number().optional(),
      currentSpeed: z3.number().optional(),
      fuelLevel: z3.number().optional(),
      assignedFieldId: z3.number().nullable().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const updateData = {};
      if (input.status) updateData.status = input.status;
      if (input.currentLat !== void 0) updateData.currentLat = input.currentLat.toString();
      if (input.currentLng !== void 0) updateData.currentLng = input.currentLng.toString();
      if (input.currentSpeed !== void 0) updateData.currentSpeed = input.currentSpeed.toString();
      if (input.fuelLevel !== void 0) updateData.fuelLevel = input.fuelLevel.toString();
      if (input.assignedFieldId !== void 0) updateData.assignedFieldId = input.assignedFieldId;
      await db.update(machines).set(updateData).where(eq3(machines.id, input.id));
      return { success: true };
    })
  }),
  // 文件存储路由
  files: router({
    // 获取文件列表
    list: protectedProcedure.input(z3.object({
      category: z3.enum(["field_image", "drone_image", "document", "report", "other"]).optional(),
      relatedFieldId: z3.number().optional(),
      relatedMachineId: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(files);
      return query.orderBy(desc(files.createdAt));
    }),
    // 上传文件（接收base64编码的文件数据）
    upload: protectedProcedure.input(z3.object({
      filename: z3.string().min(1),
      mimeType: z3.string().min(1),
      base64Data: z3.string().min(1),
      category: z3.enum(["field_image", "drone_image", "document", "report", "other"]).default("other"),
      relatedFieldId: z3.number().optional(),
      relatedMachineId: z3.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const buffer = Buffer.from(input.base64Data, "base64");
      const fileSize = buffer.length;
      const fileExt = input.filename.split(".").pop() || "";
      const uniqueId = nanoid(12);
      const fileKey = `uploads/${ctx.user.id}/${input.category}/${uniqueId}.${fileExt}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
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
        uploaderId: ctx.user.id
      });
      return { success: true, url, fileKey };
    }),
    // 删除文件
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.delete(files).where(eq3(files.id, input.id));
      return { success: true };
    })
  }),
  // 作业记录路由
  workLogs: router({
    // 获取作业记录列表
    list: publicProcedure.input(z3.object({
      machineId: z3.number().optional(),
      fieldId: z3.number().optional(),
      limit: z3.number().min(1).max(100).default(50)
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(workLogs);
      if (input?.machineId) {
        query = query.where(eq3(workLogs.machineId, input.machineId));
      }
      if (input?.fieldId) {
        query = query.where(eq3(workLogs.fieldId, input.fieldId));
      }
      return query.orderBy(desc(workLogs.createdAt)).limit(input?.limit ?? 50);
    }),
    // 获取单个作业记录详情
    get: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(workLogs).where(eq3(workLogs.id, input.id)).limit(1);
      return result[0] ?? null;
    }),
    // 获取农机作业统计
    getStats: publicProcedure.input(z3.object({
      machineId: z3.number().optional(),
      fieldId: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalLogs: 0, totalWorkArea: 0, totalFuelConsumed: 0, totalWorkHours: 0 };
      let query = db.select().from(workLogs);
      if (input?.machineId) {
        query = query.where(eq3(workLogs.machineId, input.machineId));
      }
      if (input?.fieldId) {
        query = query.where(eq3(workLogs.fieldId, input.fieldId));
      }
      const logsResult = await query;
      const logs = Array.isArray(logsResult) ? logsResult : [];
      let totalWorkArea = 0;
      let totalFuelConsumed = 0;
      let totalWorkHours = 0;
      logs.forEach((log) => {
        if (log.workArea) totalWorkArea += parseFloat(log.workArea);
        if (log.fuelConsumed) totalFuelConsumed += parseFloat(log.fuelConsumed);
        if (log.startTime && log.endTime) {
          const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1e3 * 60 * 60);
          totalWorkHours += hours;
        }
      });
      return {
        totalLogs: logs.length,
        totalWorkArea: Math.round(totalWorkArea * 100) / 100,
        totalFuelConsumed: Math.round(totalFuelConsumed * 100) / 100,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100
      };
    }),
    // 创建作业记录
    create: protectedProcedure.input(z3.object({
      machineId: z3.number(),
      fieldId: z3.number(),
      startTime: z3.date(),
      endTime: z3.date().optional(),
      workArea: z3.number().optional(),
      totalYield: z3.number().optional(),
      avgYield: z3.number().optional(),
      avgMoisture: z3.number().optional(),
      fuelConsumed: z3.number().optional(),
      pathGeoJson: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
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
        pathGeoJson: input.pathGeoJson
      });
      return { success: true };
    }),
    // 更新作业记录
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      endTime: z3.date().optional(),
      workArea: z3.number().optional(),
      totalYield: z3.number().optional(),
      avgYield: z3.number().optional(),
      avgMoisture: z3.number().optional(),
      fuelConsumed: z3.number().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const updateData = {};
      if (input.endTime) updateData.endTime = input.endTime;
      if (input.workArea !== void 0) updateData.workArea = input.workArea.toString();
      if (input.totalYield !== void 0) updateData.totalYield = input.totalYield.toString();
      if (input.avgYield !== void 0) updateData.avgYield = input.avgYield.toString();
      if (input.avgMoisture !== void 0) updateData.avgMoisture = input.avgMoisture.toString();
      if (input.fuelConsumed !== void 0) updateData.fuelConsumed = input.fuelConsumed.toString();
      await db.update(workLogs).set(updateData).where(eq3(workLogs.id, input.id));
      return { success: true };
    }),
    // 删除作业记录
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.delete(workLogs).where(eq3(workLogs.id, input.id));
      return { success: true };
    })
  }),
  // 保养记录管理路由
  maintenance: router({
    // 获取保养记录列表
    listLogs: publicProcedure.input(z3.object({
      machineId: z3.number().optional(),
      limit: z3.number().min(1).max(100).default(50)
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(maintenanceLogs);
      if (input?.machineId) {
        query = query.where(eq3(maintenanceLogs.machineId, input.machineId));
      }
      return query.orderBy(desc(maintenanceLogs.maintenanceDate)).limit(input?.limit ?? 50);
    }),
    // 获取单个保养记录详情
    getLog: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(maintenanceLogs).where(eq3(maintenanceLogs.id, input.id)).limit(1);
      return result[0] ?? null;
    }),
    // 创建保养记录
    createLog: protectedProcedure.input(z3.object({
      machineId: z3.number(),
      maintenanceType: z3.enum(["routine", "repair", "inspection", "parts_replace"]),
      maintenanceDate: z3.date(),
      engineHoursAtMaintenance: z3.number().optional(),
      description: z3.string().optional(),
      partsReplaced: z3.string().optional(),
      // JSON string
      laborCost: z3.number().optional(),
      partsCost: z3.number().optional(),
      totalCost: z3.number().optional(),
      technician: z3.string().optional(),
      notes: z3.string().optional(),
      nextMaintenanceHours: z3.number().optional(),
      nextMaintenanceDate: z3.date().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
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
        nextMaintenanceDate: input.nextMaintenanceDate
      });
      return { success: true };
    }),
    // 更新保养记录
    updateLog: protectedProcedure.input(z3.object({
      id: z3.number(),
      maintenanceType: z3.enum(["routine", "repair", "inspection", "parts_replace"]).optional(),
      description: z3.string().optional(),
      partsReplaced: z3.string().optional(),
      laborCost: z3.number().optional(),
      partsCost: z3.number().optional(),
      totalCost: z3.number().optional(),
      technician: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const updateData = {};
      if (input.maintenanceType) updateData.maintenanceType = input.maintenanceType;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.partsReplaced !== void 0) updateData.partsReplaced = input.partsReplaced;
      if (input.laborCost !== void 0) updateData.laborCost = input.laborCost.toString();
      if (input.partsCost !== void 0) updateData.partsCost = input.partsCost.toString();
      if (input.totalCost !== void 0) updateData.totalCost = input.totalCost.toString();
      if (input.technician !== void 0) updateData.technician = input.technician;
      if (input.notes !== void 0) updateData.notes = input.notes;
      await db.update(maintenanceLogs).set(updateData).where(eq3(maintenanceLogs.id, input.id));
      return { success: true };
    }),
    // 删除保养记录
    deleteLog: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.delete(maintenanceLogs).where(eq3(maintenanceLogs.id, input.id));
      return { success: true };
    }),
    // 获取保养计划列表
    listPlans: publicProcedure.input(z3.object({
      machineId: z3.number().optional(),
      status: z3.enum(["pending", "due", "overdue", "completed"]).optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(maintenancePlans);
      if (input?.machineId) {
        query = query.where(eq3(maintenancePlans.machineId, input.machineId));
      }
      if (input?.status) {
        query = query.where(eq3(maintenancePlans.status, input.status));
      }
      return query.orderBy(desc(maintenancePlans.priority));
    }),
    // 创建保养计划
    createPlan: protectedProcedure.input(z3.object({
      machineId: z3.number(),
      planType: z3.enum(["oil_change", "filter_replace", "belt_check", "brake_service", "hydraulic_service", "engine_overhaul", "general_service"]),
      intervalHours: z3.number(),
      lastServiceHours: z3.number().optional(),
      lastServiceDate: z3.date().optional(),
      estimatedCost: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const nextServiceHours = input.lastServiceHours ? input.lastServiceHours + input.intervalHours : input.intervalHours;
      await db.insert(maintenancePlans).values({
        machineId: input.machineId,
        planType: input.planType,
        intervalHours: input.intervalHours.toString(),
        lastServiceHours: input.lastServiceHours?.toString(),
        lastServiceDate: input.lastServiceDate,
        nextServiceHours: nextServiceHours.toString(),
        estimatedCost: input.estimatedCost?.toString(),
        notes: input.notes
      });
      return { success: true };
    }),
    // 更新保养计划状态
    updatePlanStatus: protectedProcedure.input(z3.object({
      id: z3.number(),
      status: z3.enum(["pending", "due", "overdue", "completed"]),
      lastServiceHours: z3.number().optional(),
      lastServiceDate: z3.date().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      const updateData = {
        status: input.status
      };
      if (input.lastServiceHours !== void 0) {
        updateData.lastServiceHours = input.lastServiceHours.toString();
      }
      if (input.lastServiceDate) {
        updateData.lastServiceDate = input.lastServiceDate;
      }
      await db.update(maintenancePlans).set(updateData).where(eq3(maintenancePlans.id, input.id));
      return { success: true };
    }),
    // 删除保养计划
    deletePlan: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u4E0D\u53EF\u7528");
      await db.delete(maintenancePlans).where(eq3(maintenancePlans.id, input.id));
      return { success: true };
    }),
    // 获取设备保养统计
    getStats: publicProcedure.input(z3.object({ machineId: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalLogs: 0, totalCost: 0, avgCostPerService: 0, lastServiceDate: null };
      const logs = await db.select().from(maintenanceLogs).where(eq3(maintenanceLogs.machineId, input.machineId)).orderBy(desc(maintenanceLogs.maintenanceDate));
      let totalCost = 0;
      logs.forEach((log) => {
        if (log.totalCost) totalCost += parseFloat(log.totalCost);
      });
      return {
        totalLogs: logs.length,
        totalCost: Math.round(totalCost * 100) / 100,
        avgCostPerService: logs.length > 0 ? Math.round(totalCost / logs.length * 100) / 100 : 0,
        lastServiceDate: logs[0]?.maintenanceDate ?? null
      };
    }),
    // 智能保养预测
    predictMaintenance: publicProcedure.input(z3.object({ machineId: z3.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { predictions: [], healthScore: 100 };
      const machineResult = await db.select().from(machines).where(eq3(machines.id, input.machineId)).limit(1);
      const machine = machineResult[0];
      if (!machine) return { predictions: [], healthScore: 100 };
      const currentEngineHours = machine.engineHours ? parseFloat(machine.engineHours) : 0;
      const plans = await db.select().from(maintenancePlans).where(eq3(maintenancePlans.machineId, input.machineId));
      const logs = await db.select().from(maintenanceLogs).where(eq3(maintenanceLogs.machineId, input.machineId)).orderBy(desc(maintenanceLogs.maintenanceDate));
      const avgDailyHours = 8;
      const predictions = [];
      const planTypeNames = {
        oil_change: "\u6362\u673A\u6CB9",
        filter_replace: "\u66F4\u6362\u6EE4\u82AF",
        belt_check: "\u76AE\u5E26\u68C0\u67E5",
        brake_service: "\u5236\u52A8\u7CFB\u7EDF\u4FDD\u517B",
        hydraulic_service: "\u6DB2\u538B\u7CFB\u7EDF\u4FDD\u517B",
        engine_overhaul: "\u53D1\u52A8\u673A\u5927\u4FEE",
        general_service: "\u7EFC\u5408\u4FDD\u517B"
      };
      plans.forEach((plan) => {
        const nextServiceHours = plan.nextServiceHours ? parseFloat(plan.nextServiceHours) : 0;
        const remainingHours = nextServiceHours - currentEngineHours;
        const daysUntilService = remainingHours / avgDailyHours;
        const predictedDate = /* @__PURE__ */ new Date();
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
          estimatedCost: plan.estimatedCost ? parseFloat(plan.estimatedCost) : 0
        });
      });
      let healthScore = 100;
      predictions.forEach((p) => {
        if (p.urgency === "overdue") healthScore -= 25;
        else if (p.urgency === "urgent") healthScore -= 15;
        else if (p.urgency === "high") healthScore -= 10;
        else if (p.urgency === "medium") healthScore -= 5;
      });
      healthScore = Math.max(0, healthScore);
      const urgencyOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
      predictions.sort(
        (a, b) => (urgencyOrder[a.urgency] || 5) - (urgencyOrder[b.urgency] || 5)
      );
      return { predictions, healthScore };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/telemetry.ts
import crypto2 from "crypto";
import fs2 from "fs";
import path3 from "path";
import { z as z4 } from "zod";
import { eq as eq4 } from "drizzle-orm";
var ENV2 = {
  requireSignature: (process.env.TELEMETRY_REQUIRE_SIGNATURE ?? "true") === "true",
  autoRegister: (process.env.TELEMETRY_AUTO_REGISTER ?? "false") === "true",
  maxClockSkewMs: Number(process.env.TELEMETRY_MAX_CLOCK_SKEW_MS ?? 5 * 60 * 1e3),
  nonceTtlMs: Number(process.env.TELEMETRY_NONCE_TTL_MS ?? 10 * 60 * 1e3),
  // 若数据库不可用/未注册设备，是否允许把遥测写入本机文件（用于你“先上传到本电脑”阶段）
  fileFallback: (process.env.TELEMETRY_FILE_FALLBACK ?? "true") === "true",
  fileDir: process.env.TELEMETRY_FILE_DIR ?? "telemetry_logs"
};
var TelemetryEnvelopeSchema = z4.object({
  schema: z4.literal("telemetry.v0.1"),
  deviceId: z4.string().min(1),
  sentAt: z4.number().int().nonnegative(),
  seq: z4.number().int().nonnegative(),
  firmwareVersion: z4.string().optional(),
  projectId: z4.string().optional(),
  // zod 版本兼容：record 需要显式 key/value schema
  payload: z4.record(z4.string(), z4.any())
});
var TelemetryBatchSchema = z4.object({
  items: z4.array(TelemetryEnvelopeSchema).min(1).max(2e3)
});
function sha256Hex(buf) {
  return crypto2.createHash("sha256").update(buf).digest("hex");
}
function hmacSha256Hex(secret, data) {
  return crypto2.createHmac("sha256", secret).update(data).digest("hex");
}
function getHeader(req, name) {
  const v = req.header(name);
  return typeof v === "string" ? v : void 0;
}
function timingSafeEqualHex(a, b) {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (aa.length !== bb.length) return false;
    return crypto2.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}
function nonceKey(deviceId, nonce) {
  return `${deviceId}:${nonce}`;
}
function getNonceCache() {
  if (!globalThis.__telemetryNonceCache) globalThis.__telemetryNonceCache = /* @__PURE__ */ new Map();
  return globalThis.__telemetryNonceCache;
}
function nonceSeenRecently(deviceId, nonce) {
  const now = Date.now();
  const cache = getNonceCache();
  const key = nonceKey(deviceId, nonce);
  const seenAt = cache.get(key);
  if (seenAt && now - seenAt < ENV2.nonceTtlMs) return true;
  cache.set(key, now);
  if (cache.size > 5e4) {
    let removed = 0;
    cache.forEach((t2, k) => {
      if (now - t2 > ENV2.nonceTtlMs) {
        cache.delete(k);
        removed++;
      }
    });
    if (cache.size > 8e4 && removed === 0) {
      let c = 0;
      cache.forEach((_t, k) => {
        cache.delete(k);
        c++;
        if (c > 2e4) return;
      });
    }
  }
  return false;
}
async function getOrAutoRegisterMachine(deviceId, firmwareVersion, providedSecret) {
  const db = await getDb();
  if (!db) return { db: null, machine: null, secret: null };
  try {
    const found = await db.select().from(machines).where(eq4(machines.deviceId, deviceId)).limit(1);
    if (found[0]) {
      return { db, machine: found[0], secret: found[0].deviceSecret ?? null };
    }
  } catch (e) {
    console.warn("[Telemetry] DB query failed, fallback to file:", e);
    return { db: null, machine: null, secret: null };
  }
  if (!ENV2.autoRegister) {
    return { db, machine: null, secret: null };
  }
  if (!providedSecret) {
    return { db, machine: null, secret: null };
  }
  try {
    await db.insert(machines).values({
      name: `\u8BBE\u5907 ${deviceId}`,
      type: "harvester",
      // 默认；后续可在后台修正
      deviceId,
      deviceSecret: providedSecret,
      firmwareVersion,
      status: "online"
    });
    const created = await db.select().from(machines).where(eq4(machines.deviceId, deviceId)).limit(1);
    return { db, machine: created[0] ?? null, secret: providedSecret };
  } catch (e) {
    console.warn("[Telemetry] DB insert failed, fallback to file:", e);
    return { db: null, machine: null, secret: null };
  }
}
function buildCanonicalString(params) {
  return `${params.timestamp}
${params.nonce}
${params.method.toUpperCase()}
${params.path}
${params.bodySha256Hex}`;
}
async function verifySignature(req, path4, deviceSecret, deviceId) {
  const ts = getHeader(req, "X-Timestamp");
  const nonce = getHeader(req, "X-Nonce");
  const sig = getHeader(req, "X-Signature");
  const alg = getHeader(req, "X-Signature-Alg");
  if (!ts || !nonce || !sig) return { ok: false, reason: "missing_signature_headers" };
  if (alg && alg !== "HMAC-SHA256") return { ok: false, reason: "unsupported_alg" };
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "bad_timestamp" };
  const skew = Math.abs(Date.now() - tsNum);
  if (skew > ENV2.maxClockSkewMs) return { ok: false, reason: "timestamp_skew" };
  if (nonceSeenRecently(deviceId, nonce)) return { ok: false, reason: "replay_nonce" };
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  const bodyHash = sha256Hex(raw);
  const canonical = buildCanonicalString({
    timestamp: ts,
    nonce,
    method: req.method,
    path: path4,
    bodySha256Hex: bodyHash
  });
  const expectedHex = hmacSha256Hex(deviceSecret, canonical);
  if (!timingSafeEqualHex(sig.toLowerCase(), expectedHex.toLowerCase())) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
function extractFields(payload) {
  const p = payload?.position ?? {};
  const s = payload?.state ?? {};
  const c = payload?.consumables ?? {};
  const pt = payload?.powertrain ?? {};
  const lat = typeof p.lat === "number" ? p.lat : void 0;
  const lng = typeof p.lng === "number" ? p.lng : void 0;
  const speedKph = typeof p.speedKph === "number" ? p.speedKph : void 0;
  const headingDeg = typeof p.headingDeg === "number" ? p.headingDeg : void 0;
  const status = typeof s.status === "string" ? s.status : void 0;
  const fuelPct = typeof c.fuelPct === "number" ? c.fuelPct : void 0;
  const defPct = typeof c.defPct === "number" ? c.defPct : void 0;
  const rpm = typeof pt.rpm === "number" ? pt.rpm : void 0;
  const loadPct = typeof pt.loadPct === "number" ? pt.loadPct : void 0;
  return { lat, lng, speedKph, headingDeg, status, fuelPct, defPct, rpm, loadPct };
}
async function ingestOne(req, res, envelope, routePath) {
  const deviceIdHeader = getHeader(req, "X-Device-Id");
  if (deviceIdHeader && deviceIdHeader !== envelope.deviceId) {
    return res.status(400).json({ ok: false, error: "device_id_mismatch" });
  }
  const providedSecret = getHeader(req, "X-Device-Secret");
  const { db, machine, secret } = await getOrAutoRegisterMachine(envelope.deviceId, envelope.firmwareVersion, providedSecret);
  if (!db || !machine || !secret) {
    if (!ENV2.fileFallback) {
      if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
      return res.status(401).json({ ok: false, error: "device_not_registered" });
    }
    if (ENV2.requireSignature) {
      if (!providedSecret) return res.status(401).json({ ok: false, error: "missing_device_secret_for_signature" });
      const v = await verifySignature(req, routePath, providedSecret, envelope.deviceId);
      if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
    }
    const outDir = path3.isAbsolute(ENV2.fileDir) ? ENV2.fileDir : path3.join(process.cwd(), ENV2.fileDir);
    fs2.mkdirSync(outDir, { recursive: true });
    const file = path3.join(outDir, `${envelope.deviceId}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.ndjson`);
    const record = {
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      headers: {
        deviceId: deviceIdHeader ?? envelope.deviceId,
        timestamp: getHeader(req, "X-Timestamp") ?? null,
        nonce: getHeader(req, "X-Nonce") ?? null,
        signatureAlg: getHeader(req, "X-Signature-Alg") ?? null
      },
      envelope
    };
    fs2.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
    return res.json({ ok: true, storedTo: "file", file: path3.basename(file), serverTime: Date.now() });
  }
  if (ENV2.requireSignature) {
    const v = await verifySignature(req, routePath, secret, envelope.deviceId);
    if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
  }
  const extracted = extractFields(envelope.payload);
  try {
    await db.insert(machineTelemetry).values({
      deviceId: envelope.deviceId,
      machineId: machine.id,
      seq: envelope.seq,
      sentAt: envelope.sentAt,
      lat: extracted.lat?.toString(),
      lng: extracted.lng?.toString(),
      speedKph: extracted.speedKph?.toString(),
      headingDeg: extracted.headingDeg?.toString(),
      status: extracted.status,
      fuelPct: extracted.fuelPct?.toString(),
      defPct: extracted.defPct?.toString(),
      rpm: extracted.rpm?.toString(),
      loadPct: extracted.loadPct?.toString(),
      payloadJson: JSON.stringify(envelope.payload ?? {})
    });
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (!msg.toLowerCase().includes("duplicate")) {
      console.error("[Telemetry] insert failed:", e);
      return res.status(500).json({ ok: false, error: "telemetry_insert_failed" });
    }
  }
  const nextStatus = extracted.status === "offline" ? "offline" : "online";
  await db.update(machines).set({
    status: nextStatus,
    currentLat: extracted.lat !== void 0 ? extracted.lat.toString() : void 0,
    currentLng: extracted.lng !== void 0 ? extracted.lng.toString() : void 0,
    currentSpeed: extracted.speedKph !== void 0 ? extracted.speedKph.toString() : void 0,
    fuelLevel: extracted.fuelPct !== void 0 ? extracted.fuelPct.toString() : void 0,
    firmwareVersion: envelope.firmwareVersion ?? machine.firmwareVersion ?? void 0,
    lastSeenAt: /* @__PURE__ */ new Date()
  }).where(eq4(machines.id, machine.id));
  return res.json({ ok: true, serverTime: Date.now() });
}
function registerTelemetryRoutes(app) {
  app.post("/api/telemetry", async (req, res) => {
    const parsed = TelemetryEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });
    return ingestOne(req, res, parsed.data, "/api/telemetry");
  });
  app.post("/api/telemetry/batch", async (req, res) => {
    const parsed = TelemetryBatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });
    const first = parsed.data.items[0];
    const deviceIdHeader = getHeader(req, "X-Device-Id");
    if (deviceIdHeader && deviceIdHeader !== first.deviceId) return res.status(400).json({ ok: false, error: "device_id_mismatch" });
    const providedSecret = getHeader(req, "X-Device-Secret");
    const { db, machine, secret } = await getOrAutoRegisterMachine(first.deviceId, first.firmwareVersion, providedSecret);
    if (!db || !machine || !secret) {
      if (!ENV2.fileFallback) {
        if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
        return res.status(401).json({ ok: false, error: "device_not_registered" });
      }
      if (ENV2.requireSignature) {
        if (!providedSecret) return res.status(401).json({ ok: false, error: "missing_device_secret_for_signature" });
        const v = await verifySignature(req, "/api/telemetry/batch", providedSecret, first.deviceId);
        if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
      }
      const outDir = path3.isAbsolute(ENV2.fileDir) ? ENV2.fileDir : path3.join(process.cwd(), ENV2.fileDir);
      fs2.mkdirSync(outDir, { recursive: true });
      const file = path3.join(outDir, `${first.deviceId}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.ndjson`);
      for (const item of parsed.data.items) {
        if (item.deviceId !== first.deviceId) continue;
        fs2.appendFileSync(
          file,
          JSON.stringify({ receivedAt: (/* @__PURE__ */ new Date()).toISOString(), envelope: item, batch: true }) + "\n",
          "utf8"
        );
      }
      return res.json({ ok: true, storedTo: "file", file: path3.basename(file), ingested: parsed.data.items.length, serverTime: Date.now() });
    }
    if (ENV2.requireSignature) {
      const v = await verifySignature(req, "/api/telemetry/batch", secret, first.deviceId);
      if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
    }
    let okCount = 0;
    for (const item of parsed.data.items) {
      if (item.deviceId !== first.deviceId) continue;
      const extracted = extractFields(item.payload);
      try {
        await db.insert(machineTelemetry).values({
          deviceId: item.deviceId,
          machineId: machine.id,
          seq: item.seq,
          sentAt: item.sentAt,
          lat: extracted.lat?.toString(),
          lng: extracted.lng?.toString(),
          speedKph: extracted.speedKph?.toString(),
          headingDeg: extracted.headingDeg?.toString(),
          status: extracted.status,
          fuelPct: extracted.fuelPct?.toString(),
          defPct: extracted.defPct?.toString(),
          rpm: extracted.rpm?.toString(),
          loadPct: extracted.loadPct?.toString(),
          payloadJson: JSON.stringify(item.payload ?? {})
        });
        okCount++;
      } catch (e) {
        const msg = String(e?.message ?? e);
        if (msg.toLowerCase().includes("duplicate")) {
          okCount++;
          continue;
        }
        console.error("[Telemetry] batch insert failed:", e);
      }
    }
    const last = parsed.data.items[parsed.data.items.length - 1];
    const lastExtracted = extractFields(last.payload);
    const nextStatus = lastExtracted.status === "offline" ? "offline" : "online";
    await db.update(machines).set({
      status: nextStatus,
      currentLat: lastExtracted.lat !== void 0 ? lastExtracted.lat.toString() : void 0,
      currentLng: lastExtracted.lng !== void 0 ? lastExtracted.lng.toString() : void 0,
      currentSpeed: lastExtracted.speedKph !== void 0 ? lastExtracted.speedKph.toString() : void 0,
      fuelLevel: lastExtracted.fuelPct !== void 0 ? lastExtracted.fuelPct.toString() : void 0,
      firmwareVersion: last.firmwareVersion ?? machine.firmwareVersion ?? void 0,
      lastSeenAt: /* @__PURE__ */ new Date()
    }).where(eq4(machines.id, machine.id));
    return res.json({ ok: true, ingested: okCount, serverTime: Date.now() });
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(helmet({
    contentSecurityPolicy: false,
    // 禁用CSP以解决高德地图API加载问题
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: "1.0.0"
    });
  });
  app.get("/ready", (_req, res) => {
    res.json({
      status: "ready",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.use(express2.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  registerLocalAuthRoutes(app);
  registerTelemetryRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                                                            \u2551
\u2551   \u{1F33E} \u53CB\u8C0A\u519C\u573A\u667A\u6167\u519C\u4E1A\u5E73\u53F0 - \u670D\u52A1\u5668\u5DF2\u542F\u52A8                    \u2551
\u2551                                                            \u2551
\u2551   \u5730\u5740: http://localhost:${port}/                           \u2551
\u2551   \u73AF\u5883: ${process.env.NODE_ENV || "development"}                              \u2551
\u2551   \u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}                    \u2551
\u2551                                                            \u2551
\u2551   \u5B89\u5168\u914D\u7F6E: \u2705 Helmet\u5DF2\u542F\u7528                                 \u2551
\u2551   \u6027\u80FD\u4F18\u5316: \u2705 Gzip\u538B\u7F29\u5DF2\u542F\u7528                               \u2551
\u2551                                                            \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
    `);
  });
  process.on("SIGTERM", () => {
    console.log("\u6536\u5230SIGTERM\u4FE1\u53F7\uFF0C\u6B63\u5728\u4F18\u96C5\u5173\u95ED\u670D\u52A1\u5668...");
    server.close(() => {
      console.log("\u670D\u52A1\u5668\u5DF2\u5173\u95ED");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    console.log("\u6536\u5230SIGINT\u4FE1\u53F7\uFF0C\u6B63\u5728\u4F18\u96C5\u5173\u95ED\u670D\u52A1\u5668...");
    server.close(() => {
      console.log("\u670D\u52A1\u5668\u5DF2\u5173\u95ED");
      process.exit(0);
    });
  });
}
startServer().catch(console.error);
