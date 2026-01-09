import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { machineTelemetry, machines } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line no-var
  var __telemetryNonceCache: Map<string, number> | undefined;
}

type RawBodyRequest = Request & { rawBody?: Buffer };

const ENV = {
  requireSignature: (process.env.TELEMETRY_REQUIRE_SIGNATURE ?? "true") === "true",
  autoRegister: (process.env.TELEMETRY_AUTO_REGISTER ?? "false") === "true",
  maxClockSkewMs: Number(process.env.TELEMETRY_MAX_CLOCK_SKEW_MS ?? 5 * 60 * 1000),
  nonceTtlMs: Number(process.env.TELEMETRY_NONCE_TTL_MS ?? 10 * 60 * 1000),
  // 若数据库不可用/未注册设备，是否允许把遥测写入本机文件（用于你“先上传到本电脑”阶段）
  fileFallback: (process.env.TELEMETRY_FILE_FALLBACK ?? "true") === "true",
  fileDir: process.env.TELEMETRY_FILE_DIR ?? "telemetry_logs",
};

const TelemetryEnvelopeSchema = z.object({
  schema: z.literal("telemetry.v0.1"),
  deviceId: z.string().min(1),
  sentAt: z.number().int().nonnegative(),
  seq: z.number().int().nonnegative(),
  firmwareVersion: z.string().optional(),
  projectId: z.string().optional(),
  // zod 版本兼容：record 需要显式 key/value schema
  payload: z.record(z.string(), z.any()),
});

const TelemetryBatchSchema = z.object({
  items: z.array(TelemetryEnvelopeSchema).min(1).max(2000),
});

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function hmacSha256Hex(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function getHeader(req: Request, name: string) {
  const v = req.header(name);
  return typeof v === "string" ? v : undefined;
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (aa.length !== bb.length) return false;
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function nonceKey(deviceId: string, nonce: string) {
  return `${deviceId}:${nonce}`;
}

function getNonceCache() {
  if (!globalThis.__telemetryNonceCache) globalThis.__telemetryNonceCache = new Map();
  return globalThis.__telemetryNonceCache;
}

function nonceSeenRecently(deviceId: string, nonce: string) {
  const now = Date.now();
  const cache = getNonceCache();
  const key = nonceKey(deviceId, nonce);
  const seenAt = cache.get(key);
  if (seenAt && now - seenAt < ENV.nonceTtlMs) return true;
  cache.set(key, now);
  // 轻量清理（避免无限增长）
  if (cache.size > 50000) {
    let removed = 0;
    cache.forEach((t, k) => {
      if (now - t > ENV.nonceTtlMs) {
        cache.delete(k);
        removed++;
      }
    });
    // 保底：若仍过大，随机清掉一部分（避免极端情况下内存膨胀）
    if (cache.size > 80000 && removed === 0) {
      let c = 0;
      cache.forEach((_t, k) => {
        cache.delete(k);
        c++;
        if (c > 20000) return;
      });
    }
  }
  return false;
}

type MachineLookup = { db: any | null; machine: any | null; secret: string | null };

async function getOrAutoRegisterMachine(deviceId: string, firmwareVersion?: string, providedSecret?: string) {
  const db = await getDb();
  if (!db) return { db: null, machine: null, secret: null } satisfies MachineLookup;

  try {
    const found = await db.select().from(machines).where(eq(machines.deviceId, deviceId)).limit(1);
    if (found[0]) {
      return { db, machine: found[0], secret: found[0].deviceSecret ?? null };
    }
  } catch (e) {
    // 数据库连接/查询失败：降级为“无DB”，由上层走文件落盘兜底，避免进程崩溃
    console.warn("[Telemetry] DB query failed, fallback to file:", e);
    return { db: null, machine: null, secret: null } satisfies MachineLookup;
  }

  if (!ENV.autoRegister) {
    return { db, machine: null, secret: null } satisfies MachineLookup;
  }

  if (!providedSecret) {
    return { db, machine: null, secret: null } satisfies MachineLookup;
  }

  // v0.1 简化：首次上报允许携带 secret 进行自动注册（生产建议关闭）
  try {
    await db.insert(machines).values({
      name: `设备 ${deviceId}`,
      type: "harvester", // 默认；后续可在后台修正
      deviceId,
      deviceSecret: providedSecret,
      firmwareVersion,
      status: "online",
    });
    const created = await db.select().from(machines).where(eq(machines.deviceId, deviceId)).limit(1);
    return { db, machine: created[0] ?? null, secret: providedSecret } satisfies MachineLookup;
  } catch (e) {
    console.warn("[Telemetry] DB insert failed, fallback to file:", e);
    return { db: null, machine: null, secret: null } satisfies MachineLookup;
  }
}

function buildCanonicalString(params: {
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  bodySha256Hex: string;
}) {
  return `${params.timestamp}\n${params.nonce}\n${params.method.toUpperCase()}\n${params.path}\n${params.bodySha256Hex}`;
}

type VerifyResult = { ok: true } | { ok: false; reason: string };

async function verifySignature(req: RawBodyRequest, path: string, deviceSecret: string, deviceId: string): Promise<VerifyResult> {
  const ts = getHeader(req, "X-Timestamp");
  const nonce = getHeader(req, "X-Nonce");
  const sig = getHeader(req, "X-Signature");
  const alg = getHeader(req, "X-Signature-Alg");

  if (!ts || !nonce || !sig) return { ok: false, reason: "missing_signature_headers" };
  if (alg && alg !== "HMAC-SHA256") return { ok: false, reason: "unsupported_alg" };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "bad_timestamp" };
  const skew = Math.abs(Date.now() - tsNum);
  if (skew > ENV.maxClockSkewMs) return { ok: false, reason: "timestamp_skew" };
  if (nonceSeenRecently(deviceId, nonce)) return { ok: false, reason: "replay_nonce" };

  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  const bodyHash = sha256Hex(raw);
  const canonical = buildCanonicalString({
    timestamp: ts,
    nonce,
    method: req.method,
    path,
    bodySha256Hex: bodyHash,
  });
  const expectedHex = hmacSha256Hex(deviceSecret, canonical);

  // 支持设备侧用 hex（推荐）；若设备侧用 base64，可后续加一层兼容
  if (!timingSafeEqualHex(sig.toLowerCase(), expectedHex.toLowerCase())) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

function extractFields(payload: any) {
  const p = payload?.position ?? {};
  const s = payload?.state ?? {};
  const c = payload?.consumables ?? {};
  const pt = payload?.powertrain ?? {};

  const lat = typeof p.lat === "number" ? p.lat : undefined;
  const lng = typeof p.lng === "number" ? p.lng : undefined;
  const speedKph = typeof p.speedKph === "number" ? p.speedKph : undefined;
  const headingDeg = typeof p.headingDeg === "number" ? p.headingDeg : undefined;
  const status = typeof s.status === "string" ? s.status : undefined;
  const fuelPct = typeof c.fuelPct === "number" ? c.fuelPct : undefined;
  const defPct = typeof c.defPct === "number" ? c.defPct : undefined;
  const rpm = typeof pt.rpm === "number" ? pt.rpm : undefined;
  const loadPct = typeof pt.loadPct === "number" ? pt.loadPct : undefined;

  return { lat, lng, speedKph, headingDeg, status, fuelPct, defPct, rpm, loadPct };
}

async function ingestOne(req: RawBodyRequest, res: Response, envelope: z.infer<typeof TelemetryEnvelopeSchema>, routePath: string) {
  const deviceIdHeader = getHeader(req, "X-Device-Id");
  if (deviceIdHeader && deviceIdHeader !== envelope.deviceId) {
    return res.status(400).json({ ok: false, error: "device_id_mismatch" });
  }

  const providedSecret = getHeader(req, "X-Device-Secret"); // 仅用于 autoRegister/无DB落盘阶段
  const { db, machine, secret } = await getOrAutoRegisterMachine(envelope.deviceId, envelope.firmwareVersion, providedSecret);

  // 无数据库或设备未注册：落到本机文件（用于初期接入/联调）
  if (!db || !machine || !secret) {
    if (!ENV.fileFallback) {
      if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
      return res.status(401).json({ ok: false, error: "device_not_registered" });
    }

    // 如果仍要求签名：使用 X-Device-Secret 作为临时 secret 来验签（便于你先让硬件“实时传到本机”）
    if (ENV.requireSignature) {
      if (!providedSecret) return res.status(401).json({ ok: false, error: "missing_device_secret_for_signature" });
      const v = await verifySignature(req, routePath, providedSecret, envelope.deviceId);
      if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
    }

    const outDir = path.isAbsolute(ENV.fileDir) ? ENV.fileDir : path.join(process.cwd(), ENV.fileDir);
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${envelope.deviceId}_${new Date().toISOString().slice(0, 10)}.ndjson`);
    const record = {
      receivedAt: new Date().toISOString(),
      headers: {
        deviceId: deviceIdHeader ?? envelope.deviceId,
        timestamp: getHeader(req, "X-Timestamp") ?? null,
        nonce: getHeader(req, "X-Nonce") ?? null,
        signatureAlg: getHeader(req, "X-Signature-Alg") ?? null,
      },
      envelope,
    };
    fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
    return res.json({ ok: true, storedTo: "file", file: path.basename(file), serverTime: Date.now() });
  }

  if (ENV.requireSignature) {
    const v = await verifySignature(req, routePath, secret, envelope.deviceId);
    if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
  }

  const extracted = extractFields(envelope.payload);

  // 1) 遥测入库（幂等：deviceId + seq）
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
      payloadJson: JSON.stringify(envelope.payload ?? {}),
    });
  } catch (e: any) {
    // 幂等：若重复 seq 直接当成功
    const msg = String(e?.message ?? e);
    if (!msg.toLowerCase().includes("duplicate")) {
      console.error("[Telemetry] insert failed:", e);
      return res.status(500).json({ ok: false, error: "telemetry_insert_failed" });
    }
  }

  // 2) 更新机器最新状态（用于地图/机队）
  const nextStatus = extracted.status === "offline" ? "offline" : "online";
  await db
    .update(machines)
    .set({
      status: nextStatus as any,
      currentLat: extracted.lat !== undefined ? extracted.lat.toString() : undefined,
      currentLng: extracted.lng !== undefined ? extracted.lng.toString() : undefined,
      currentSpeed: extracted.speedKph !== undefined ? extracted.speedKph.toString() : undefined,
      fuelLevel: extracted.fuelPct !== undefined ? extracted.fuelPct.toString() : undefined,
      firmwareVersion: envelope.firmwareVersion ?? machine.firmwareVersion ?? undefined,
      lastSeenAt: new Date(),
    })
    .where(eq(machines.id, machine.id));

  return res.json({ ok: true, serverTime: Date.now() });
}

export function registerTelemetryRoutes(app: Express) {
  // 单条上报
  app.post("/api/telemetry", async (req: RawBodyRequest, res: Response) => {
    const parsed = TelemetryEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });
    return ingestOne(req, res, parsed.data, "/api/telemetry");
  });

  // 批量补传
  app.post("/api/telemetry/batch", async (req: RawBodyRequest, res: Response) => {
    const parsed = TelemetryBatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_body", details: parsed.error.flatten() });

    // 批量时：同一个签名验证整个请求体；设备侧建议一次batch同一deviceId
    const first = parsed.data.items[0];
    const deviceIdHeader = getHeader(req, "X-Device-Id");
    if (deviceIdHeader && deviceIdHeader !== first.deviceId) return res.status(400).json({ ok: false, error: "device_id_mismatch" });

    const providedSecret = getHeader(req, "X-Device-Secret");
    const { db, machine, secret } = await getOrAutoRegisterMachine(first.deviceId, first.firmwareVersion, providedSecret);

    // 无数据库或未注册：批量落盘（同 deviceId）
    if (!db || !machine || !secret) {
      if (!ENV.fileFallback) {
        if (!db) return res.status(503).json({ ok: false, error: "db_unavailable" });
        return res.status(401).json({ ok: false, error: "device_not_registered" });
      }
      if (ENV.requireSignature) {
        if (!providedSecret) return res.status(401).json({ ok: false, error: "missing_device_secret_for_signature" });
        const v = await verifySignature(req, "/api/telemetry/batch", providedSecret, first.deviceId);
        if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
      }

      const outDir = path.isAbsolute(ENV.fileDir) ? ENV.fileDir : path.join(process.cwd(), ENV.fileDir);
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${first.deviceId}_${new Date().toISOString().slice(0, 10)}.ndjson`);
      for (const item of parsed.data.items) {
        if (item.deviceId !== first.deviceId) continue;
        fs.appendFileSync(
          file,
          JSON.stringify({ receivedAt: new Date().toISOString(), envelope: item, batch: true }) + "\n",
          "utf8"
        );
      }
      return res.json({ ok: true, storedTo: "file", file: path.basename(file), ingested: parsed.data.items.length, serverTime: Date.now() });
    }

    if (ENV.requireSignature) {
      const v = await verifySignature(req, "/api/telemetry/batch", secret, first.deviceId);
      if (!v.ok) return res.status(401).json({ ok: false, error: v.reason });
    }

    // 逐条入库（幂等）
    let okCount = 0;
    for (const item of parsed.data.items) {
      if (item.deviceId !== first.deviceId) continue; // v0.1：先不支持跨设备混批
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
          payloadJson: JSON.stringify(item.payload ?? {}),
        });
        okCount++;
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.toLowerCase().includes("duplicate")) {
          okCount++;
          continue;
        }
        console.error("[Telemetry] batch insert failed:", e);
      }
    }

    // 更新最新状态（取 batch 最后一条）
    const last = parsed.data.items[parsed.data.items.length - 1];
    const lastExtracted = extractFields(last.payload);
    const nextStatus = lastExtracted.status === "offline" ? "offline" : "online";
    await db
      .update(machines)
      .set({
        status: nextStatus as any,
        currentLat: lastExtracted.lat !== undefined ? lastExtracted.lat.toString() : undefined,
        currentLng: lastExtracted.lng !== undefined ? lastExtracted.lng.toString() : undefined,
        currentSpeed: lastExtracted.speedKph !== undefined ? lastExtracted.speedKph.toString() : undefined,
        fuelLevel: lastExtracted.fuelPct !== undefined ? lastExtracted.fuelPct.toString() : undefined,
        firmwareVersion: last.firmwareVersion ?? machine.firmwareVersion ?? undefined,
        lastSeenAt: new Date(),
      })
      .where(eq(machines.id, machine.id));

    return res.json({ ok: true, ingested: okCount, serverTime: Date.now() });
  });
}

