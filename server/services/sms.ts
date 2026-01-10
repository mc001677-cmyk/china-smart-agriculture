import crypto from "crypto";

export type SmsScene = "register" | "login" | "resetPassword" | "bindPhone";

export interface SmsService {
  sendVerificationCode(phone: string, scene: SmsScene): Promise<{ success: boolean; code?: string; message?: string }>;
}

export class AliyunSmsService implements SmsService {
  async sendVerificationCode(phone: string, scene: SmsScene) {
    console.log(`[AliyunSMS] Sending code to ${phone} for ${scene}`);
    // TODO: 接入阿里云 SDK
    // const client = new AliyunSDK.Client({ accessKeyId: process.env.SMS_ACCESS_KEY_ID, ... });
    // await client.sendSms({ PhoneNumbers: phone, SignName: process.env.SMS_SIGN_NAME, ... });
    return { success: true };
  }
}

export class TencentSmsService implements SmsService {
  async sendVerificationCode(phone: string, scene: SmsScene) {
    console.log(`[TencentSMS] Sending code to ${phone} for ${scene}`);
    // TODO: 接入腾讯云 SDK
    return { success: true };
  }
}

export class MockSmsService implements SmsService {
  async sendVerificationCode(phone: string, scene: SmsScene) {
    const code = "123456"; // 默认 Mock 验证码
    console.warn(`[MockSMS] >>> SMS MOCK MODE <<<`);
    console.warn(`[MockSMS] Target: ${phone}, Scene: ${scene}, Code: ${code}`);
    return { success: true, code };
  }
}

export class SmsServiceFactory {
  static getService(): SmsService {
    const provider = process.env.SMS_PROVIDER?.toUpperCase();
    if (provider === "ALIYUN" && process.env.SMS_ACCESS_KEY_ID) {
      return new AliyunSmsService();
    } else if (provider === "TENCENT" && process.env.SMS_SECRET_ID) {
      return new TencentSmsService();
    }
    return new MockSmsService();
  }
}

/**
 * 生成 6 位数字验证码
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 验证码 Hash 处理
 */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code + (process.env.SMS_SALT || "smart_agri")).digest("hex");
}
