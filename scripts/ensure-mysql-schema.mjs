/**
 * Ensure MySQL schema is compatible with current drizzle/schema.ts
 * - Fixes cases where __drizzle_migrations claims applied but some columns are missing.
 * - Safe to run multiple times (best-effort idempotent).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/ensure-mysql-schema.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const dbName = url.pathname.slice(1);
const conn = await mysql.createConnection({
  host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: dbName,
  ssl: { rejectUnauthorized: false },
});

async function tableExists(table) {
  const [rows] = await conn.execute(
    "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [dbName, table]
  );
  return Number(rows?.[0]?.c ?? 0) > 0;
}

async function columnExists(table, column) {
  const [rows] = await conn.execute(
    "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [dbName, table, column]
  );
  return Number(rows?.[0]?.c ?? 0) > 0;
}

async function indexExists(table, indexName) {
  // NOTE: mysql2 `execute` 不支持 `??` 这种 identifier placeholder；这里用白名单表名拼接。
  if (!["users", "workOrders"].includes(table)) {
    throw new Error(`Unsafe table name: ${table}`);
  }
  const [rows] = await conn.query(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
    [indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function execIgnore(sql, params) {
  try {
    await conn.execute(sql, params);
    console.log("[OK]", sql);
  } catch (e) {
    // Best-effort: ignore "already exists" kinds of errors
    const code = e?.code;
    if (code === "ER_DUP_FIELDNAME" || code === "ER_CANT_DROP_FIELD_OR_KEY" || code === "ER_DUP_KEYNAME") {
      console.log("[SKIP]", sql, code);
      return;
    }
    console.error("[FAIL]", sql, code || e?.message || e);
    throw e;
  }
}

// ---- users table ----
if (await tableExists("users")) {
  const addColumns = [
    { name: "wechatOpenid", ddl: "ALTER TABLE `users` ADD `wechatOpenid` varchar(128)" },
    { name: "wechatUnionid", ddl: "ALTER TABLE `users` ADD `wechatUnionid` varchar(128)" },
    { name: "phoneVerified", ddl: "ALTER TABLE `users` ADD `phoneVerified` int NOT NULL DEFAULT 0" },
    { name: "isAdmin", ddl: "ALTER TABLE `users` ADD `isAdmin` int NOT NULL DEFAULT 0" },
    { name: "adminRole", ddl: "ALTER TABLE `users` ADD `adminRole` enum('super_admin','operation','support')" },
    { name: "status", ddl: "ALTER TABLE `users` ADD `status` enum('active','frozen','deleted') NOT NULL DEFAULT 'active'" },
    { name: "frozenAt", ddl: "ALTER TABLE `users` ADD `frozenAt` timestamp NULL" },
    { name: "frozenReason", ddl: "ALTER TABLE `users` ADD `frozenReason` text NULL" },
  ];

  for (const c of addColumns) {
    if (!(await columnExists("users", c.name))) {
      await execIgnore(c.ddl);
    }
  }

  // Unique indexes for wechat ids
  if (await columnExists("users", "wechatOpenid")) {
    if (!(await indexExists("users", "users_wechatOpenid_unique"))) {
      await execIgnore(
        "CREATE UNIQUE INDEX `users_wechatOpenid_unique` ON `users` (`wechatOpenid`)"
      );
    }
  }
  if (await columnExists("users", "wechatUnionid")) {
    if (!(await indexExists("users", "users_wechatUnionid_unique"))) {
      await execIgnore(
        "CREATE UNIQUE INDEX `users_wechatUnionid_unique` ON `users` (`wechatUnionid`)"
      );
    }
  }
}

// ---- workOrders table ----
if (await tableExists("workOrders")) {
  const cols = [
    { name: "contactName", ddl: "ALTER TABLE `workOrders` ADD `contactName` varchar(64)" },
    { name: "contactPhone", ddl: "ALTER TABLE `workOrders` ADD `contactPhone` varchar(32)" },
    { name: "contactWechat", ddl: "ALTER TABLE `workOrders` ADD `contactWechat` varchar(64)" },
    { name: "contactAddress", ddl: "ALTER TABLE `workOrders` ADD `contactAddress` text" },
  ];
  for (const c of cols) {
    if (!(await columnExists("workOrders", c.name))) {
      await execIgnore(c.ddl);
    }
  }
}

console.log("[Done] Schema ensured for DB:", dbName);
await conn.end();

