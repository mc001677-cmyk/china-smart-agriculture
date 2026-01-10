import { ISmsService, SmsResult, SmsScene } from "../types";

export class AliyunSmsDriver implements ISmsService {
  private accessKeyId: string;
  private accessKeySecret: string;
  private signName: string;
  private templateCode: string;

  constructor() {
    this.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || "";
    this.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || "";
    this.signName = process.env.ALIYUN_SMS_SIGN_NAME || "阿里云短信测试";
    this.templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || "SMS_154950909";
  }

  async sendVerificationCode(phone: string, scene: SmsScene, code: string): Promise<SmsResult> {
    if (!this.accessKeyId || !this.accessKeySecret) {
      console.error("[AliyunSMS] Missing credentials");
      return { success: false, message: "Server configuration error: Missing Aliyun credentials" };
    }

    // TODO: To use Aliyun SMS, install the SDK:
    // pnpm add @alicloud/pop-core
    
    /*
    const Core = require('@alicloud/pop-core');
    
    const client = new Core({
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });

    try {
      const params = {
        "RegionId": "cn-hangzhou",
        "PhoneNumbers": phone,
        "SignName": this.signName,
        "TemplateCode": this.templateCode,
        "TemplateParam": JSON.stringify({ code })
      };
      
      await client.request('SendSms', params, { method: 'POST' });
      return { success: true };
    } catch (e: any) {
      console.error("[AliyunSMS] Send failed:", e);
      return { success: false, message: e.message || "Aliyun SMS failed" };
    }
    */

    console.log(`[AliyunSMS] (Simulation) Sending ${code} to ${phone} via template ${this.templateCode}`);
    console.log(`[AliyunSMS] To enable real sending, uncomment the SDK code in server/services/sms/drivers/aliyun.ts`);
    
    // For now, we simulate success if keys are present, but log that it's simulated
    return { success: true, message: "Aliyun SMS (Simulated) sent" };
  }
}
