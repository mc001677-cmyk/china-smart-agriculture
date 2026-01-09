/**
 * 友谊农场智慧农业平台 - 模拟数据生成
 *
 * 背景假设：北方约 200,000 亩大型现代化农场，拥有成体系的联合收割机、拖拉机、播种机、
 * 植保机等完整机队。当前模拟数据仅抽取其中 10 台代表性设备与部分管理区，用于演示与联调。
 *
 * 【v2.0 精简版】
 * 车队规模：10台设备（从大场里抽样）
 * - Harvest机 6台：约翰迪尔2台、凯斯2台、纽荷兰1台、克拉斯1台
 * - 运粮车 4台：每个品牌各1台
 *
 * 【重要设计原则】
 * 1. 坐标范围严格使用 config.ts 中定义的边界
 * 2. 只使用 config.ts 中定义的4个管理区
 * 3. 每个品牌对应一个管理区
 * 4. 所有坐标生成后必须验证在边界内
 *
 * 位置：黑龙江省双鸭山市友谊县友谊农场
 * 中心坐标：131.85°E, 46.85°N
 */

import { MachineData } from "@/contexts/FleetContext";
import { 
  FARM_CONFIG, 
  BRAND_CONFIG as CONFIG_BRAND, 
  BrandId, 
  FARM_FIELDS,
  MANAGEMENT_ZONES,
  Coordinate
} from "./config";

// ============================================================================
// 默认参数
// ============================================================================

export const defaultParams = {
  rpm: 2000, speed: 5.0, fuelRate: 45.0, intakeHumidity: 45, pressure: 101.3, airTemp: 8,
  fuelTemp: 38, defLevel: 75, defTemp: 22, defRate: 0.5, defPressure: 520,
  scrInTemp: 300, scrOutTemp: 285, dpfSoot: 12, dpfDiffPressure: 2.0,
  docInTemp: 330, docOutTemp: 315, ptoSpeed: 0, hitchPos: 0, hitchForce: 0,
  engineOilHealth: 98, hydraulicOilHealth: 95, filterHealth: 92
};

// 从统一配置文件导入（确保单一数据源）
export const FARM_CENTER = FARM_CONFIG.center;
export const FARM_BOUNDARY = FARM_CONFIG.boundary;

// 品牌配置（从统一配置文件导入，转换格式以保持向后兼容）
export const BRAND_CONFIG = Object.fromEntries(
  Object.entries(CONFIG_BRAND).map(([key, value]) => [
    key,
    {
      name: value.name,
      color: value.primary,
      accent: value.secondary,
      harvesterImage: value.harvesterImage,
      tractorImage: value.tractorImage
    }
  ])
) as Record<BrandId, { name: string; color: string; accent: string; harvesterImage: string; tractorImage: string }>;

// ============================================================================
// 坐标生成函数（核心算法）
// ============================================================================

/**
 * 根据品牌获取对应的管理区
 * - 区域1（西北）：约翰迪尔
 * - 区域2（东北）：凯斯
 * - 区域3（西南）：纽荷兰
 * - 区域4（东南）：克拉斯
 */
const getZoneForBrand = (brand: BrandId): number => {
  switch (brand) {
    case 'john_deere': return 1;  // NW Zone
    case 'case_ih': return 2;     // NE Zone
    case 'new_holland': return 3; // SW Zone
    case 'claas': return 4;       // SE Zone
    default: return 1;
  }
};

/**
 * 在指定管理区内生成坐标
 */
const generateCoordinateInZone = (zoneId: number): Coordinate => {
  const zone = MANAGEMENT_ZONES.find(z => z.id === zoneId);
  if (!zone) {
    return FARM_CONFIG.center;
  }
  
  const field = FARM_FIELDS.find(f => f.zoneId === zoneId);
  if (!field) {
    return zone.center;
  }
  
  const fieldBoundary = {
    north: Math.max(...field.boundary.map(p => p.lat)),
    south: Math.min(...field.boundary.map(p => p.lat)),
    east: Math.max(...field.boundary.map(p => p.lng)),
    west: Math.min(...field.boundary.map(p => p.lng))
  };
  
  const latOffset = (Math.random() - 0.5) * 0.008;
  const lngOffset = (Math.random() - 0.5) * 0.008;
  
  let lat = zone.center.lat + latOffset;
  let lng = zone.center.lng + lngOffset;
  
  const margin = 0.001;
  lat = Math.max(fieldBoundary.south + margin, Math.min(fieldBoundary.north - margin, lat));
  lng = Math.max(fieldBoundary.west + margin, Math.min(fieldBoundary.east - margin, lng));
  
  lat = Math.max(FARM_CONFIG.boundary.south, Math.min(FARM_CONFIG.boundary.north, lat));
  lng = Math.max(FARM_CONFIG.boundary.west, Math.min(FARM_CONFIG.boundary.east, lng));
  
  return { lat, lng };
};

// ============================================================================
// 设备状态生成
// ============================================================================

const generateStatus = () => {
  const rand = Math.random();
  if (rand < 0.60) return "working";
  if (rand < 0.82) return "moving";
  if (rand < 0.95) return "idle";
  return "offline";
};

const generateParams = (status: string, type: string) => {
  if (status === "working") {
    return {
      ...defaultParams,
      rpm: 2100 + Math.random() * 350,
      speed: type === "harvester" ? 4.5 + Math.random() * 2.5 : 5 + Math.random() * 3,
      fuelRate: type === "harvester" ? 50 + Math.random() * 18 : 28 + Math.random() * 12
    };
  } else if (status === "moving") {
    return {
      ...defaultParams,
      rpm: 1650 + Math.random() * 250,
      speed: type === "harvester" ? 18 + Math.random() * 8 : 22 + Math.random() * 10,
      fuelRate: type === "harvester" ? 28 + Math.random() * 10 : 22 + Math.random() * 8
    };
  }
  return { ...defaultParams, rpm: 0, speed: 0, fuelRate: 0 };
};

// ============================================================================
// 设备数据生成 - v2.0 精简版（10台设备）
// ============================================================================

const initialFleetData: MachineData[] = [];

/**
 * 车队配置 v2.0
 * 
 * Harvest机（6台）：
 * 1. 约翰迪尔 S760 #01 - NW Zone
 * 2. 约翰迪尔 S770 #02 - NW Zone
 * 3. 凯斯 8250 #01 - NE Zone
 * 4. 凯斯 9250 #02 - NE Zone
 * 5. 纽荷兰 CR9.90 #01 - SW Zone
 * 6. 克拉斯 LEXION 770 #01 - SE Zone
 * 
 * 运粮车（4台）：
 * 7. 约翰迪尔 9R #01 - NW Zone
 * 8. 凯斯 Magnum #01 - NE Zone
 * 9. 纽荷兰 T9 #01 - SW Zone
 * 10. 克拉斯 XERION #01 - SE Zone
 */

// ========== Harvest机（6台）==========

// 1. 约翰迪尔 S760 #01 - NW Zone
let status = generateStatus();
let pos = generateCoordinateInZone(1);
initialFleetData.push({
  id: 1,
  name: "约翰迪尔 S760 #01",
  serial: "JD-S760-0001",
  type: "harvester",
  brand: "john_deere",
  status: status as any,
  statusText: status === "working" ? "Corn Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 65 + Math.random() * 30,
  def: 55 + Math.random() * 40,
  load: status === "working" ? 65 + Math.random() * 30 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 620 + Math.random() * 80 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 2800 + Math.random() * 1200,
  areaWorked: 2100 + Math.random() * 400,
  params: generateParams(status, "harvester")
});

// 2. 约翰迪尔 S770 #02 - NW Zone
status = generateStatus();
pos = generateCoordinateInZone(1);
initialFleetData.push({
  id: 2,
  name: "约翰迪尔 S770 #02",
  serial: "JD-S770-0002",
  type: "harvester",
  brand: "john_deere",
  status: status as any,
  statusText: status === "working" ? "Corn Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 58 + Math.random() * 35,
  def: 52 + Math.random() * 43,
  load: status === "working" ? 68 + Math.random() * 28 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 640 + Math.random() * 80 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 3200 + Math.random() * 1400,
  areaWorked: 2400 + Math.random() * 500,
  params: generateParams(status, "harvester")
});

// 3. 凯斯 8250 #01 - NE Zone
status = generateStatus();
pos = generateCoordinateInZone(2);
initialFleetData.push({
  id: 3,
  name: "凯斯 8250 #01",
  serial: "CASE-8250-0001",
  type: "harvester",
  brand: "case_ih",
  status: status as any,
  statusText: status === "working" ? "Soybean Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 62 + Math.random() * 33,
  def: 50 + Math.random() * 45,
  load: status === "working" ? 66 + Math.random() * 29 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 630 + Math.random() * 75 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 2900 + Math.random() * 1300,
  areaWorked: 2200 + Math.random() * 450,
  params: generateParams(status, "harvester")
});

// 4. 凯斯 9250 #02 - NE Zone
status = generateStatus();
pos = generateCoordinateInZone(2);
initialFleetData.push({
  id: 4,
  name: "凯斯 9250 #02",
  serial: "CASE-9250-0002",
  type: "harvester",
  brand: "case_ih",
  status: status as any,
  statusText: status === "working" ? "Soybean Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 55 + Math.random() * 40,
  def: 48 + Math.random() * 47,
  load: status === "working" ? 70 + Math.random() * 26 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 650 + Math.random() * 80 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 3100 + Math.random() * 1500,
  areaWorked: 2350 + Math.random() * 480,
  params: generateParams(status, "harvester")
});

// 5. 纽荷兰 CR9.90 #01 - SW Zone
status = generateStatus();
pos = generateCoordinateInZone(3);
initialFleetData.push({
  id: 5,
  name: "纽荷兰 CR9.90 #01",
  serial: "NH-CR990-0001",
  type: "harvester",
  brand: "new_holland",
  status: status as any,
  statusText: status === "working" ? "Corn Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 60 + Math.random() * 35,
  def: 54 + Math.random() * 41,
  load: status === "working" ? 64 + Math.random() * 31 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 610 + Math.random() * 70 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 2700 + Math.random() * 1100,
  areaWorked: 2050 + Math.random() * 380,
  params: generateParams(status, "harvester")
});

// 6. 克拉斯 LEXION 770 #01 - SE Zone
status = generateStatus();
pos = generateCoordinateInZone(4);
initialFleetData.push({
  id: 6,
  name: "克拉斯 LEXION 770 #01",
  serial: "CL-LEX770-0001",
  type: "harvester",
  brand: "claas",
  status: status as any,
  statusText: status === "working" ? "Soybean Harvesting" : status === "moving" ? "Moving" : "Idle",
  fuel: 68 + Math.random() * 27,
  def: 56 + Math.random() * 39,
  load: status === "working" ? 67 + Math.random() * 28 : 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  yield: status === "working" ? 635 + Math.random() * 75 : 0,
  moisture: 14 + Math.random() * 3,
  grainTank: Math.random() * 100,
  totalYield: 3000 + Math.random() * 1350,
  areaWorked: 2280 + Math.random() * 460,
  params: generateParams(status, "harvester")
});

// ========== 运粮车（4台）==========

// 7. 约翰迪尔 9R #01 - NW Zone
status = generateStatus();
pos = generateCoordinateInZone(1);
initialFleetData.push({
  id: 7,
  name: "约翰迪尔运粮车 9R #01",
  serial: "GC-JD9R-0001",
  type: "tractor",
  brand: "john_deere",
  status: status as any,
  statusText: status === "moving" ? "运粮转运中" : status === "working" ? "协同卸粮" : "Idle",
  fuel: 55 + Math.random() * 40,
  def: 50 + Math.random() * 45,
  load: 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  grainTank: Math.random() * 100,
  params: generateParams(status, "tractor")
});

// 8. 凯斯 Magnum #01 - NE Zone
status = generateStatus();
pos = generateCoordinateInZone(2);
initialFleetData.push({
  id: 8,
  name: "凯斯运粮车 Magnum #01",
  serial: "GC-CASE-MAG-0001",
  type: "tractor",
  brand: "case_ih",
  status: status as any,
  statusText: status === "moving" ? "运粮转运中" : status === "working" ? "协同卸粮" : "Idle",
  fuel: 52 + Math.random() * 43,
  def: 48 + Math.random() * 47,
  load: 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  grainTank: Math.random() * 100,
  params: generateParams(status, "tractor")
});

// 9. 纽荷兰 T9 #01 - SW Zone
status = generateStatus();
pos = generateCoordinateInZone(3);
initialFleetData.push({
  id: 9,
  name: "运粮车 纽荷兰 T9 #01",
  serial: "GC-NH-T9-0001",
  type: "tractor",
  brand: "new_holland",
  status: status as any,
  statusText: status === "moving" ? "运粮转运中" : status === "working" ? "协同卸粮" : "Idle",
  fuel: 58 + Math.random() * 37,
  def: 52 + Math.random() * 43,
  load: 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  grainTank: Math.random() * 100,
  params: generateParams(status, "tractor")
});

// 10. 克拉斯 XERION #01 - SE Zone
status = generateStatus();
pos = generateCoordinateInZone(4);
initialFleetData.push({
  id: 10,
  name: "运粮车 克拉斯 XERION #01",
  serial: "GC-CL-XER-0001",
  type: "tractor",
  brand: "claas",
  status: status as any,
  statusText: status === "moving" ? "运粮转运中" : status === "working" ? "协同卸粮" : "Idle",
  fuel: 60 + Math.random() * 35,
  def: 54 + Math.random() * 41,
  load: 0,
  lat: pos.lat,
  lng: pos.lng,
  heading: Math.floor(Math.random() * 360),
  grainTank: Math.random() * 100,
  params: generateParams(status, "tractor")
});

// ============================================================================
// 导出
// ============================================================================

export { initialFleetData };

// 为了向后兼容，导出别名
export const initialFleet = initialFleetData;

/**
 * 数据波动函数（用于实时更新）
 * @param value 当前值
 * @param range 波动范围
 * @param min 最小值限制
 * @param max 最大值限制
 */
export const fluctuate = (value: number, range: number = 5, min: number = 0, max: number = 100): number => {
  const delta = (Math.random() - 0.5) * 2 * range;
  const newValue = value + delta;
  return Math.max(min, Math.min(max, newValue));
};

// ============================================================================
// 作业日志生成（调整为10台设备的规模）
// ============================================================================

export interface WorkLog {
  id: number;
  machineId: number;
  machineName: string;
  brand: string;
  workType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  area: number;
  yield: number;
  fuelUsed: number;
  avgSpeed: number;
  efficiency: number;
}

/**
 * 生成作业日志
 * 10台设备，每天约 3000-5000 亩作业量
 */
export const generateWorkLogs = (days: number = 30): WorkLog[] => {
  const logs: WorkLog[] = [];
  let logId = 1;
  const now = new Date();
  
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    
    // 每台设备每天生成1-2条作业记录
    initialFleetData.forEach(machine => {
      const numLogs = 1 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < numLogs; i++) {
        const startHour = 6 + Math.floor(Math.random() * 12);
        const duration = 2 + Math.random() * 4; // 2-6小时
        
        const startTime = new Date(date);
        startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + Math.floor(duration));
        
        const isHarvester = machine.type === "harvester";
        const workType = isHarvester ? "Harvest" : "运粮";
        
        // Harvest机：每小时约 50-80 亩
        // 运粮车：每小时约 30-50 亩（协同作业）
        const areaPerHour = isHarvester ? 50 + Math.random() * 30 : 30 + Math.random() * 20;
        const area = areaPerHour * duration;
        
        // 产量：约 600 kg/亩
        const yieldAmount = isHarvester ? area * (550 + Math.random() * 100) : 0;
        
        logs.push({
          id: logId++,
          machineId: machine.id,
          machineName: machine.name,
          brand: machine.brand,
          workType,
          startTime,
          endTime,
          duration: Math.round(duration * 60),
          area: Math.round(area * 10) / 10,
          yield: Math.round(yieldAmount),
          fuelUsed: Math.round((isHarvester ? 55 : 35) * duration * 10) / 10,
          avgSpeed: isHarvester ? 5 + Math.random() * 2 : 8 + Math.random() * 4,
          efficiency: areaPerHour
        });
      }
    });
  }
  
  return logs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
};

// ============================================================================
// 警报生成（调整为10台设备的规模）
// ============================================================================

export interface Alert {
  id: number;
  machineId: number;
  machineName: string;
  brand: string;
  type: "warning" | "error" | "info";
  category: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * 生成警报数据
 * 10台设备，警报数量相应减少
 */
export const generateAlerts = (count: number = 30): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  
  const alertTemplates = [
    { type: "warning" as const, category: "发动机", message: "发动机温度偏高，建议检查冷却系统" },
    { type: "warning" as const, category: "液压", message: "液压油压力波动，建议检查液压系统" },
    { type: "info" as const, category: "保养", message: "即将到达保养里程，请安排保养" },
    { type: "info" as const, category: "效率", message: "当前作业效率高于平均水平" },
    { type: "warning" as const, category: "燃油", message: "燃油液位低于30%，请及时加油" },
    { type: "info" as const, category: "天气", message: "未来2小时可能有降雨，请注意作业安排" },
    { type: "info" as const, category: "产量", message: "当前地块产量高于预期" },
    { type: "warning" as const, category: "滤芯", message: "空气滤芯需要更换" }
  ];
  
  for (let i = 0; i < count; i++) {
    const machine = initialFleetData[Math.floor(Math.random() * initialFleetData.length)];
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const hoursAgo = Math.floor(Math.random() * 72);
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    
    const resolved = Math.random() > 0.15;
    
    alerts.push({
      id: i + 1,
      machineId: machine.id,
      machineName: machine.name,
      brand: machine.brand,
      type: template.type,
      category: template.category,
      message: template.message,
      timestamp,
      resolved,
      resolvedAt: resolved ? new Date(timestamp.getTime() + Math.random() * 3600000 * 4) : undefined
    });
  }
  
  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// ============================================================================
// 轨迹数据生成
// ============================================================================

export interface TrajectoryPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  speed: number;
  heading: number;
}

/**
 * 生成设备轨迹数据
 */
export const generateTrajectory = (machineId: number, date: Date): TrajectoryPoint[] => {
  const machine = initialFleetData.find(m => m.id === machineId);
  if (!machine) return [];
  
  const points: TrajectoryPoint[] = [];
  const startTime = new Date(date);
  startTime.setHours(6, 0, 0, 0);
  
  let currentLat = machine.lat;
  let currentLng = machine.lng;
  let currentHeading = machine.heading;
  
  // 生成8小时的轨迹数据（每分钟一个点）
  for (let minute = 0; minute < 480; minute++) {
    const timestamp = new Date(startTime);
    timestamp.setMinutes(timestamp.getMinutes() + minute);
    
    // S形作业轨迹
    const rowLength = 0.002;
    const rowWidth = 0.0003;
    const row = Math.floor(minute / 20);
    const posInRow = (minute % 20) / 20;
    
    const direction = row % 2 === 0 ? 1 : -1;
    currentLng = machine.lng + direction * posInRow * rowLength;
    currentLat = machine.lat - row * rowWidth;
    
    // 确保在边界内
    currentLat = Math.max(FARM_CONFIG.boundary.south, Math.min(FARM_CONFIG.boundary.north, currentLat));
    currentLng = Math.max(FARM_CONFIG.boundary.west, Math.min(FARM_CONFIG.boundary.east, currentLng));
    
    currentHeading = direction === 1 ? 90 : 270;
    
    points.push({
      lat: currentLat,
      lng: currentLng,
      timestamp,
      speed: 4 + Math.random() * 3,
      heading: currentHeading
    });
  }
  
  return points;
};
