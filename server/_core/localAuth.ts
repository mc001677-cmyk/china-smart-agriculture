import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const RegisterSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(64),
});

const LoginSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
});

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").replace(/^\+86/, "");
}

function makeOpenIdFromPhone(phone: string) {
  return `phone:${phone}`;
}

function scryptHash(password: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyScrypt(password: string, stored: string) {
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

async function setSessionCookie(req: Request, res: Response, openId: string, name: string) {
  const sessionToken = await sdk.signSession({
    openId,
    appId: ENV.appId || "local",
    name: name || "user",
  }, { expiresInMs: ONE_YEAR_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

export function registerLocalAuthRoutes(app: Express) {
  // 传统注册：手机号+密码
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ ok: false, error: "bad_body", details: parsed.error.flatten() });

      const phone = normalizePhone(parsed.data.phone);
      const openId = makeOpenIdFromPhone(phone);
      const passwordHash = scryptHash(parsed.data.password);

      const db = await getDb();
      if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });

      // phone 唯一：用 openId 唯一也可兜底
      const exists = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);
      if (exists[0]) return res.status(409).json({ ok: false, error: "already_registered" });

      await db.insert(users).values({
        openId,
        name: parsed.data.name,
        phone,
        passwordHash,
        loginMethod: "phone",
        role: "user",
        verificationStatus: "unsubmitted",
        lastSignedIn: new Date(),
      });

      await setSessionCookie(req, res, openId, parsed.data.name);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[LocalAuth] register failed:", error);
      const msg = String(error?.message || "");
      // 常见：数据库迁移未完成导致缺列
      if (msg.includes("Unknown column")) {
        return res.status(500).json({
          ok: false,
          error: "db_schema_mismatch",
          message: "数据库结构未更新，请先执行数据库迁移/修复脚本",
        });
      }
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  // 传统登录：手机号+密码
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ ok: false, error: "bad_body", details: parsed.error.flatten() });

      const phone = normalizePhone(parsed.data.phone);
      const openId = makeOpenIdFromPhone(phone);

      const db = await getDb();
      if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });

      const found = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);
      const user = found[0];
      if (!user || !user.passwordHash)
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      if (!verifyScrypt(parsed.data.password, user.passwordHash))
        return res.status(401).json({ ok: false, error: "invalid_credentials" });

      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      await setSessionCookie(req, res, user.openId, user.name || "user");
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[LocalAuth] login failed:", error);
      const msg = String(error?.message || "");
      if (msg.includes("Unknown column")) {
        return res.status(500).json({
          ok: false,
          error: "db_schema_mismatch",
          message: "数据库结构未更新，请先执行数据库迁移/修复脚本",
        });
      }
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });
}

