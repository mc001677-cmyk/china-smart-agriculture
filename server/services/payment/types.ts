export interface PaymentOrder {
  id: string; // Internal Order ID (e.g. "ORDER_123")
  amount: number; // Amount in CNY (e.g. 66.00)
  description: string; // e.g. "Silver Membership"
  userOpenId?: string; // For Wechat JSAPI
  ip?: string; // Client IP
}

export interface PaymentResult {
  success: boolean;
  payUrl?: string; // QR Code URL or Payment Jump URL
  orderId?: string; // Third-party Order ID
  message?: string;
  extra?: any; // e.g. Wechat JSAPI params
}

export interface IPaymentService {
  createOrder(order: PaymentOrder): Promise<PaymentResult>;
  verifyCallback(data: any): Promise<{ success: boolean; orderId: string; paidAt: Date }>;
}
