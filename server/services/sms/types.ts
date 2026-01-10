export type SmsScene = "register" | "login" | "resetPassword" | "bindPhone";

export interface SmsResult {
  success: boolean;
  message?: string;
  code?: string; // For mock driver or debug
  bizId?: string; // Provider specific ID
}

export interface ISmsService {
  sendVerificationCode(phone: string, scene: SmsScene, code: string): Promise<SmsResult>;
}
