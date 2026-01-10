import { ISmsService } from "./types";
import { MockSmsDriver } from "./drivers/mock";
import { AliyunSmsDriver } from "./drivers/aliyun";

export class SmsServiceFactory {
  static getService(): ISmsService {
    const provider = process.env.SMS_PROVIDER?.toUpperCase();
    
    if (provider === "ALIYUN") {
      return new AliyunSmsDriver();
    }
    
    // Default to Mock
    return new MockSmsDriver();
  }
}
