// 农业机械交易频道类型定义

// 农机分类
export type MachineCategory =
  | "拖拉机"
  | "联合收割机"
  | "播种机"
  | "施肥机"
  | "植保喷药机"
  | "植保无人机"
  | "打捆机"
  | "插秧机"
  | "青贮机"
  | "农用装载机"
  | "农机具"
  | "其他";

// 挂牌状态
export type ListingStatus =
  | "在售"
  | "已预订"
  | "已成交"
  | "已下架";

export interface MachineListing {
  id: string;
  title: string;
  category: MachineCategory;
  brand: string;
  model: string;
  year?: number;
  hoursUsed?: number;
  horsepower?: number;
  price?: number;
  location: string;
  sellerName: string;
  sellerType: "个人" | "合作社" | "经销商";
  contactPhone: string;
  status: ListingStatus;
  description?: string;
  tags?: string[];
  images?: string[];
  createdAt: Date;
  views: number;
  isFeatured?: boolean;
}
