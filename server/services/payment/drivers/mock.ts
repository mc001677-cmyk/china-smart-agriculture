import { IPaymentService, PaymentOrder, PaymentResult } from "../types";

export class MockPaymentDriver implements IPaymentService {
  async createOrder(order: PaymentOrder): Promise<PaymentResult> {
    console.log(`[MockPayment] Creating order:`, order);
    return {
      success: true,
      payUrl: `http://localhost:3000/mock-payment?orderId=${order.id}&amount=${order.amount}`,
      message: "Mock payment order created"
    };
  }

  async verifyCallback(data: any): Promise<{ success: boolean; orderId: string; paidAt: Date }> {
    console.log(`[MockPayment] Verifying callback:`, data);
    return {
      success: true,
      orderId: data.orderId,
      paidAt: new Date()
    };
  }
}
