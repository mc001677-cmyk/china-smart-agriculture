export * from "./types";
export * from "./factory";
export * from "./drivers/mock";
export * from "./drivers/aliyun";

import crypto from "crypto";

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code + (process.env.SMS_SALT || "smart_agri")).digest("hex");
}
