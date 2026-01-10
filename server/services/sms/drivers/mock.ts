import { ISmsService, SmsResult, SmsScene } from "../types";

export class MockSmsDriver implements ISmsService {
  async sendVerificationCode(phone: string, scene: SmsScene, code: string): Promise<SmsResult> {
    console.warn(`[MockSMS] >>> SMS MOCK MODE <<<`);
    console.warn(`[MockSMS] Target: ${phone}`);
    console.warn(`[MockSMS] Scene:  ${scene}`);
    console.warn(`[MockSMS] Code:   ${code}`);
    console.warn(`[MockSMS] >>> END MOCK SMS <<<`);
    return { success: true, code, message: "Mock SMS sent" };
  }
}
