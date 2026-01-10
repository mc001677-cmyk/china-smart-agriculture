import { IPaymentService } from "./types";
import { MockPaymentDriver } from "./drivers/mock";
import { WechatPaymentDriver } from "./drivers/wechat";

export class PaymentServiceFactory {
  static getService(): IPaymentService {
    const provider = process.env.PAYMENT_PROVIDER?.toUpperCase();
    
    if (provider === "WECHAT") {
      return new WechatPaymentDriver();
    }
    
    return new MockPaymentDriver();
  }
}
