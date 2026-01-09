export interface EquipmentListing {
  id: string;
  title: string;
  type: "tractor" | "harvester" | "planter" | "sprayer" | "baler" | "other";
  brand: "john_deere" | "case_ih" | "new_holland" | "claas" | "kubota" | "other";
  model: string;
  year: number;
  hours: number;
  horsepower: number;
  price: number;
  location: string;
  description: string;
  images: string[];
  seller: {
    name: string;
    type: "farmer" | "dealer" | "coop";
    verified: boolean;
    rating: number;
  };
  status: "available" | "sold" | "pending";
  postedAt: string;
}

// 简化示例数据（避免缺失文件导致页面崩溃；后续可替换为后端/数据库数据源）
export const equipmentListings: EquipmentListing[] = [
  {
    id: "eq-001",
    title: "2022 约翰迪尔 8R 370 拖拉机",
    type: "tractor",
    brand: "john_deere",
    model: "8R 370",
    year: 2022,
    hours: 850,
    horsepower: 370,
    price: 1850000,
    location: "黑龙江省佳木斯市",
    description: "一手车，保养极佳，适合大规模播种与整地作业。",
    images: ["/images/equipment/jd-8r.jpg"],
    seller: { name: "建三江第一农场", type: "farmer", verified: true, rating: 4.9 },
    status: "available",
    postedAt: "2025-12-28",
  },
  {
    id: "eq-002",
    title: "2021 凯斯 8250 联合收割机",
    type: "harvester",
    brand: "case_ih",
    model: "Axial-Flow 8250",
    year: 2021,
    hours: 1200,
    horsepower: 498,
    price: 2680000,
    location: "吉林省松原市",
    description: "动力充沛，适配大地块高效率秋收作业。",
    images: ["/images/equipment/case-8250.jpg"],
    seller: { name: "北方联合机队", type: "coop", verified: true, rating: 4.7 },
    status: "available",
    postedAt: "2025-12-12",
  },
  {
    id: "eq-003",
    title: "2020 纽荷兰 T8.410 拖拉机（交易中）",
    type: "tractor",
    brand: "new_holland",
    model: "T8.410",
    year: 2020,
    hours: 1650,
    horsepower: 410,
    price: 1480000,
    location: "内蒙古通辽市",
    description: "适合深松/耙地/整地等重负荷作业。",
    images: ["/images/equipment/nh-t8.jpg"],
    seller: { name: "通辽农机经销商", type: "dealer", verified: true, rating: 4.6 },
    status: "pending",
    postedAt: "2025-11-30",
  },
];

