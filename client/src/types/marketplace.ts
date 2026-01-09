// 农机作业交易模块类型定义

// 作业类型
export type WorkType = '翻地' | '平整' | '播种' | '施肥' | '打药' | '收割' | '打包' | '运输';

// 用户角色
export type UserRole = '地主' | '机手' | '平台管理员';

// 订单状态
export type OrderStatus = 
  | '待抢单'      // 农场主已发布，等待机手抢单
  | '已接单'      // 机手已接单，等待确认
  | '进行中'      // 作业进行中
  | '待验收'      // 作业完成，等待验收
  | '已完成'      // 已验收并支付
  | '已取消'      // 订单已取消
  | '争议中';     // 订单有争议

// 认证类型
export type CertificationType = 
  | '身份认证'
  | '驾照认证'
  | '营业执照'
  | '设备认证'
  | '技能认证';

// 认证状态
export type CertificationStatus = '未认证' | '审核中' | '已认证' | '已过期';

// 用户认证信息
export interface UserCertification {
  id: string;
  userId: string;
  type: CertificationType;
  status: CertificationStatus;
  documentUrl: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  badges: string[]; // 徽章: "精准播种大师", "低损失收割手" 等
}

// 用户信息扩展
export interface MarketplaceUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone: string;
  
  // 评分信息
  rating: number; // 0-100
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  
  // 认证信息
  certifications: UserCertification[];
  
  // 保证金
  deposit: number; // 元
  
  // 统计
  createdAt: Date;
  lastActiveAt: Date;
}

// 地块信息
export interface FieldInfo {
  id: string;
  name: string;
  area: number; // 亩
  coordinates: Array<[number, number]>; // 地块边界坐标
  cropType: string; // 作物类型
  soilType?: string;
  slope?: number; // 坡度
  obstacles?: string[]; // 障碍物描述
}

// 作业订单
export interface WorkOrder {
  id: string;
  orderId: string; // 订单号
  
  // 发布者信息
  publisherId: string;
  publisherName: string;
  publisherRating: number;
  
  // 承接者信息
  contractorId?: string;
  contractorName?: string;
  contractorRating?: number;
  
  // 作业信息
  workType: WorkType;
  fieldId: string;
  fieldName: string;
  area: number; // 亩
  cropType: string;
  
  // 时间要求
  startDate: Date;
  endDate: Date;
  preferredTime?: string; // "上午/下午/全天"
  
  // 价格信息
  priceType: 'fixed' | 'bidding'; // 固定价或竞价
  fixedPrice?: number; // 固定价格（元/亩）
  biddingStartPrice?: number; // 竞价起价
  finalPrice?: number; // 最终价格
  
  // 订单状态
  status: OrderStatus;
  
  // 描述与要求
  description: string;
  requirements?: string[];
  
  // 作业数据（进行中/完成后）
  trackingData?: {
    startTime?: Date;
    endTime?: Date;
    actualArea?: number; // 实际作业面积
    coverage?: number; // 覆盖率 %
    damageLoss?: number; // 损失率 %
    avgSpeed?: number; // 平均速度 km/h（示例数据/看板使用）
    efficiency?: number; // 作业效率 亩/小时
    fuelUsage?: number; // 油耗 L
    trackingUrl?: string; // 轨迹数据URL
  };
  
  // 验收信息
  inspection?: {
    status: 'pending' | 'approved' | 'rejected';
    inspectedAt?: Date;
    notes?: string;
  };
  
  // 评价信息
  publisherReview?: {
    rating: number; // 1-5
    quality: number; // 作业质量评分
    punctuality: number; // 准时性评分
    attitude: number; // 服务态度评分
    comment: string;
    createdAt: Date;
  };
  
  contractorReview?: {
    rating: number; // 1-5
    paymentPunctuality: number; // 付款准时性评分
    fieldAccuracy: number; // 地块描述准确性评分
    cooperation: number; // 配合程度评分
    comment: string;
    createdAt: Date;
  };
  
  // 支付信息
  deposit: number; // 保证金
  platformFee: number; // 平台抽成 1%
  paymentStatus: 'pending' | 'paid' | 'refunded';
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// 竞价信息
export interface BidInfo {
  id: string;
  orderId: string;
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  bidPrice: number; // 元/亩
  totalPrice: number; // 总价
  estimatedDays: number; // 预计天数
  message?: string;
  createdAt: Date;
}

// 评价维度
export interface RatingDimension {
  quality: number; // 作业质量 (40%)
  punctuality: number; // 准时性 (20%)
  attitude: number; // 服务态度 (20%)
  equipment?: number; // 设备级别 (20%) - 仅车队
  paymentPunctuality?: number; // 付款准时 (40%) - 仅地主
  fieldAccuracy?: number; // 地块描述准确 (30%) - 仅地主
  cooperation?: number; // 配合程度 (20%) - 仅地主
}

// 排行榜数据
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  rating: number;
  completedOrders: number;
  specialization: WorkType; // 专长作业类型
  badge?: string; // 徽章
  avgCompletionTime: number; // 平均完成时间（天）
  avgQualityScore: number; // 平均质量评分
}

// 平台统计
export interface MarketplaceStats {
  totalOrders: number;
  completedOrders: number;
  totalVolume: number; // 总作业面积（亩）
  totalTransactionAmount: number; // 总交易额（元）
  activeContractors: number; // 活跃机手数
  activePublishers: number; // 活跃地主数
  avgOrderValue: number; // 平均订单价值
  platformRevenue: number; // 平台收入（1%抽成）
}
