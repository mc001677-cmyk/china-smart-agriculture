import { format, subDays } from "date-fns";

import { FARM_CONFIG } from "./config";

/**
 * 友谊农场 - 第5天收获数据生成器
 * 四大品牌混合车队：约翰迪尔、凯斯、纽荷兰、克拉斯
 * 目标：前5天累计完成130,000亩（第5天是今天，正在进行中）
 * 
 * 注意：坐标配置从 config.ts 导入，确保单一数据源
 */

export interface DailyLog {
  date: string;
  machineId: number;
  machineName: string;
  brand: string;
  startTime: string;
  endTime: string;
  duration: string;
  area: number;
  yield: number;
  avgYield: number;
  fuelConsumption: number;
  avgFuelRate: number;
  avgSpeed: number;
  efficiency: number;
  workType: "收割" | "运粮";
  weather?: string;
}

export interface TrajectoryPoint {
  lat: number;
  lng: number;
  time: string;
  status: "working" | "turning" | "idle" | "moving";
  speed?: number;
  rpm?: number;
}

export interface DailyTrajectory {
  date: string;
  machineId: number;
  points: TrajectoryPoint[];
  path: number[][];
  swathWidth: number;
}

export interface AlertRecord {
  id: string;
  machineId: number;
  machineName: string;
  brand: string;
  type: "warning" | "error" | "info";
  category: "fuel" | "maintenance" | "health" | "geofence" | "idle" | "efficiency" | "weather" | "yield";
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// 从统一配置文件导入（确保单一数据源）
const FARM_CENTER = FARM_CONFIG.center;
const FARM_BOUNDARY = FARM_CONFIG.boundary;

// 天气模式（5天）- 第5天是今天
const WEATHER_PATTERNS = [
  { weather: '晴', factor: 1.0, description: '天气晴好，适宜收获' },
  { weather: '晴', factor: 1.02, description: '天气晴好，作业顺利' },
  { weather: '多云', factor: 0.95, description: '多云，轻微影响' },
  { weather: '阴', factor: 0.88, description: '阴天，玉米水分偏高' },
  { weather: '晴', factor: 1.0, description: '今天天气好转，正常作业' }  // 今天
];

// 每天的目标作业面积（累计130,000亩）
// 前4天完成100,000亩，第5天目标36,000亩（83%完成约30,000亩）
const DAILY_TARGETS = [
  25000,  // 第1天：25,000亩
  28000,  // 第2天：28,000亩（天气好）
  24000,  // 第3天：24,000亩
  23000,  // 第4天：23,000亩
  36000   // 第5天（今天）：36,000亩目标，83%完成约30,000亩
];

// 四大品牌机器配置
interface MachineConfig {
  id: number;
  name: string;
  brand: string;
  type: "harvester" | "tractor";
  model: string;
  dailyCapacity: number;
  fuelRate: number;
  avgYield: number;
}

// 生成所有机器配置（与mockData保持一致）
const generateMachineConfigs = (): MachineConfig[] => {
  const configs: MachineConfig[] = [];
  let id = 1;

  // 约翰迪尔 S760 - 6台
  for (let i = 1; i <= 6; i++) {
    configs.push({
      id: id++, name: `约翰迪尔 S760 #${String(i).padStart(2, '0')}`,
      brand: "john_deere", type: "harvester", model: "John Deere S760",
      dailyCapacity: 420, fuelRate: 52, avgYield: 640
    });
  }
  // 约翰迪尔 S770 - 6台
  for (let i = 1; i <= 6; i++) {
    configs.push({
      id: id++, name: `约翰迪尔 S770 #${String(i).padStart(2, '0')}`,
      brand: "john_deere", type: "harvester", model: "John Deere S770",
      dailyCapacity: 480, fuelRate: 56, avgYield: 650
    });
  }
  // 约翰迪尔 S780 - 6台
  for (let i = 1; i <= 6; i++) {
    configs.push({
      id: id++, name: `约翰迪尔 S780 #${String(i).padStart(2, '0')}`,
      brand: "john_deere", type: "harvester", model: "John Deere S780",
      dailyCapacity: 550, fuelRate: 60, avgYield: 660
    });
  }
  // 约翰迪尔 9R 运粮车 - 5台
  for (let i = 1; i <= 5; i++) {
    configs.push({
      id: id++, name: `运粮车 JD-9R #${String(i).padStart(2, '0')}`,
      brand: "john_deere", type: "tractor", model: "John Deere 9R",
      dailyCapacity: 800, fuelRate: 32, avgYield: 0
    });
  }

  // 凯斯 8250 - 8台
  for (let i = 1; i <= 8; i++) {
    configs.push({
      id: id++, name: `凯斯 8250 #${String(i).padStart(2, '0')}`,
      brand: "case_ih", type: "harvester", model: "Case IH 8250",
      dailyCapacity: 440, fuelRate: 54, avgYield: 645
    });
  }
  // 凯斯 9250 - 7台
  for (let i = 1; i <= 7; i++) {
    configs.push({
      id: id++, name: `凯斯 9250 #${String(i).padStart(2, '0')}`,
      brand: "case_ih", type: "harvester", model: "Case IH 9250",
      dailyCapacity: 510, fuelRate: 58, avgYield: 655
    });
  }
  // 凯斯 Magnum 运粮车 - 5台
  for (let i = 1; i <= 5; i++) {
    configs.push({
      id: id++, name: `运粮车 凯斯 Magnum #${String(i).padStart(2, '0')}`,
      brand: "case_ih", type: "tractor", model: "Case IH Magnum",
      dailyCapacity: 850, fuelRate: 30, avgYield: 0
    });
  }

  // 纽荷兰 CR9.90 - 7台
  for (let i = 1; i <= 7; i++) {
    configs.push({
      id: id++, name: `纽荷兰 CR9.90 #${String(i).padStart(2, '0')}`,
      brand: "new_holland", type: "harvester", model: "New Holland CR9.90",
      dailyCapacity: 460, fuelRate: 55, avgYield: 648
    });
  }
  // 纽荷兰 CR10.90 - 7台
  for (let i = 1; i <= 7; i++) {
    configs.push({
      id: id++, name: `纽荷兰 CR10.90 #${String(i).padStart(2, '0')}`,
      brand: "new_holland", type: "harvester", model: "New Holland CR10.90",
      dailyCapacity: 540, fuelRate: 59, avgYield: 658
    });
  }
  // 纽荷兰 T9 运粮车 - 5台
  for (let i = 1; i <= 5; i++) {
    configs.push({
      id: id++, name: `运粮车 纽荷兰 T9 #${String(i).padStart(2, '0')}`,
      brand: "new_holland", type: "tractor", model: "New Holland T9",
      dailyCapacity: 820, fuelRate: 31, avgYield: 0
    });
  }

  // 克拉斯 LEXION 770 - 7台
  for (let i = 1; i <= 7; i++) {
    configs.push({
      id: id++, name: `克拉斯 LEXION 770 #${String(i).padStart(2, '0')}`,
      brand: "claas", type: "harvester", model: "CLAAS LEXION 770",
      dailyCapacity: 470, fuelRate: 54, avgYield: 652
    });
  }
  // 克拉斯 LEXION 8900 - 6台
  for (let i = 1; i <= 6; i++) {
    configs.push({
      id: id++, name: `克拉斯 LEXION 8900 #${String(i).padStart(2, '0')}`,
      brand: "claas", type: "harvester", model: "CLAAS LEXION 8900",
      dailyCapacity: 580, fuelRate: 62, avgYield: 665
    });
  }
  // 克拉斯 XERION 运粮车 - 5台
  for (let i = 1; i <= 5; i++) {
    configs.push({
      id: id++, name: `运粮车 克拉斯 XERION #${String(i).padStart(2, '0')}`,
      brand: "claas", type: "tractor", model: "CLAAS XERION",
      dailyCapacity: 880, fuelRate: 34, avgYield: 0
    });
  }

  return configs;
};

const MACHINE_CONFIGS = generateMachineConfigs();
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));

// 获取收割机配置
const getHarvesters = () => MACHINE_CONFIGS.filter(m => m.type === "harvester");
const getTractors = () => MACHINE_CONFIGS.filter(m => m.type === "tractor");

// 生成轨迹（确保在农田边界内）
const generatePath = (machineId: number, dateStr: string): { path: number[][]; points: TrajectoryPoint[] } => {
  const path: number[][] = [];
  const points: TrajectoryPoint[] = [];
  
  const dayOffset = parseInt(dateStr.split('-')[2]) || 1;
  const machineOffset = machineId % 25;
  
  // 确保轨迹在农田边界内
  const latRange = FARM_BOUNDARY.north - FARM_BOUNDARY.south;
  const lngRange = FARM_BOUNDARY.east - FARM_BOUNDARY.west;
  
  // 根据机器ID和日期分配不同的作业区域
  const zoneRow = (machineOffset % 5) / 5;
  const zoneCol = (Math.floor(machineOffset / 5) % 5) / 5;
  const dayShiftLat = ((dayOffset % 3) - 1) * 0.02;
  const dayShiftLng = ((Math.floor(dayOffset / 3) % 3) - 1) * 0.025;
  
  const startLat = FARM_BOUNDARY.south + 0.02 + (zoneRow * latRange * 0.7) + dayShiftLat;
  const startLng = FARM_BOUNDARY.west + 0.02 + (zoneCol * lngRange * 0.7) + dayShiftLng;
  
  const rows = randomInt(10, 18);
  const fieldWidth = random(0.01, 0.018);
  const rowHeight = random(0.0012, 0.002);
  
  let hour = 6;
  let minute = 0;

  for (let i = 0; i < rows; i++) {
    const isEven = i % 2 === 0;
    const lat = startLat - (i * rowHeight);
    
    const p1Lng = isEven ? startLng : startLng + fieldWidth;
    path.push([p1Lng, lat]);
    points.push({
      lat, lng: p1Lng,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      status: "working",
      speed: random(4.5, 6.8),
      rpm: random(2100, 2450)
    });
    
    minute += randomInt(14, 22);
    if (minute >= 60) { hour++; minute -= 60; }
    
    const p2Lng = isEven ? startLng + fieldWidth : startLng;
    path.push([p2Lng, lat]);
    points.push({
      lat, lng: p2Lng,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      status: "working",
      speed: random(4.5, 6.8),
      rpm: random(2100, 2450)
    });
    
    if (i < rows - 1) {
      const turnLng = isEven ? startLng + fieldWidth + 0.0006 : startLng - 0.0006;
      const turnLat = lat - rowHeight / 2;
      path.push([turnLng, turnLat]);
      minute += randomInt(3, 6);
      if (minute >= 60) { hour++; minute -= 60; }
      points.push({
        lat: turnLat, lng: turnLng,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        status: "turning",
        speed: random(2, 4),
        rpm: random(1500, 1850)
      });
    }
  }
  
  return { path, points };
};

// 生成所有历史数据
export const generateAllHistory = (): { logs: DailyLog[]; trajectories: DailyTrajectory[]; alerts: AlertRecord[] } => {
  const logs: DailyLog[] = [];
  const trajectories: DailyTrajectory[] = [];
  const alerts: AlertRecord[] = [];
  
  const today = new Date();
  const harvesters = getHarvesters();
  const tractors = getTractors();
  const harvesterCount = harvesters.length; // 60台收割机
  
  // 生成5天的数据
  for (let day = 0; day < 5; day++) {
    // 第0天是4天前，第4天是今天
    const date = subDays(today, 4 - day);
    const dateStr = format(date, 'yyyy-MM-dd');
    const weatherInfo = WEATHER_PATTERNS[day];
    const dailyTarget = DAILY_TARGETS[day];
    
    // 每台收割机的目标面积
    const areaPerHarvester = dailyTarget / harvesterCount;
    
    // 今天的数据（第5天）
    const isToday = day === 4;
    const currentHour = new Date().getHours();
    // 为了演示效果，始终显示有意义的今日数据
    // 模拟为下午16:00的进度（已完成83%）
    let todayProgress = 1;
    if (isToday) {
      // 始终模拟为下午16:00的进度，确保有数据显示
      todayProgress = 0.83; // 10/12 = 83%，模拟已作业10小时
    }
    
    // 生成收割机数据
    for (const config of harvesters) {
      // 5%概率故障停机
      if (Math.random() < 0.05) continue;
      
      const weatherFactor = weatherInfo.factor;
      const dailyArea = areaPerHarvester * weatherFactor * random(0.88, 1.12) * todayProgress;
      const workHours = (dailyArea / config.dailyCapacity) * 10;
      const actualWorkHours = Math.min(workHours, 12 * todayProgress);
      const yieldPerMu = config.avgYield * random(0.94, 1.06);
      const totalYield = dailyArea * yieldPerMu;
      const fuelConsumption = actualWorkHours * config.fuelRate * random(0.92, 1.08);
      
      const startHour = weatherInfo.weather === '阴' ? 7 : 6;
      const endHour = isToday ? currentHour : startHour + Math.floor(actualWorkHours);
      const endMinute = Math.round((actualWorkHours % 1) * 60);
      
      logs.push({
        date: dateStr,
        machineId: config.id,
        machineName: config.name,
        brand: config.brand,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
        duration: `${Math.floor(actualWorkHours)}h ${Math.round((actualWorkHours % 1) * 60)}m`,
        area: Number(dailyArea.toFixed(1)),
        yield: Math.round(totalYield),
        avgYield: Math.round(yieldPerMu),
        fuelConsumption: Math.round(fuelConsumption),
        avgFuelRate: Number(config.fuelRate.toFixed(1)),
        avgSpeed: Number(random(4.8, 6.5).toFixed(1)),
        efficiency: Number((dailyArea / Math.max(actualWorkHours, 1)).toFixed(1)),
        workType: "收割",
        weather: weatherInfo.weather
      });
      
      // 生成轨迹
      const { path, points } = generatePath(config.id, dateStr);
      trajectories.push({
        date: dateStr,
        machineId: config.id,
        points,
        path,
        swathWidth: random(6.5, 9.2)
      });
    }
    
    // 生成运粮车数据
    for (const config of tractors) {
      if (Math.random() < 0.03) continue;
      
      const weatherFactor = weatherInfo.factor;
      const dailyArea = (areaPerHarvester * 0.3) * weatherFactor * random(0.9, 1.1) * todayProgress;
      const workHours = (dailyArea / config.dailyCapacity) * 10;
      const actualWorkHours = Math.min(workHours, 14 * todayProgress);
      const fuelConsumption = actualWorkHours * config.fuelRate * random(0.9, 1.1);
      
      const startHour = 6;
      const endHour = isToday ? currentHour : startHour + Math.floor(actualWorkHours);
      const endMinute = Math.round((actualWorkHours % 1) * 60);
      
      logs.push({
        date: dateStr,
        machineId: config.id,
        machineName: config.name,
        brand: config.brand,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
        duration: `${Math.floor(actualWorkHours)}h ${Math.round((actualWorkHours % 1) * 60)}m`,
        area: Number(dailyArea.toFixed(1)),
        yield: 0,
        avgYield: 0,
        fuelConsumption: Math.round(fuelConsumption),
        avgFuelRate: Number(config.fuelRate.toFixed(1)),
        avgSpeed: Number(random(15, 28).toFixed(1)),
        efficiency: Number((dailyArea / Math.max(actualWorkHours, 1)).toFixed(1)),
        workType: "运粮",
        weather: weatherInfo.weather
      });
    }
    
    // 生成警报
    const alertTypes = [
      { type: "info" as const, category: "weather" as const, title: "天气提醒", message: "明日预计有小雨，建议调整作业计划", prob: 0.15 },
      { type: "info" as const, category: "yield" as const, title: "高产地块", message: "当前地块亩产高于平均15%", prob: 0.12 },
      { type: "info" as const, category: "efficiency" as const, title: "高效作业", message: "当前作业效率高于平均水平12%", prob: 0.1 },
      { type: "warning" as const, category: "fuel" as const, title: "燃油液位低", message: "燃油液位低于30%，请及时加油", prob: 0.08 },
      { type: "warning" as const, category: "maintenance" as const, title: "保养提醒", message: "距离下次保养还有50小时", prob: 0.06 },
      { type: "warning" as const, category: "health" as const, title: "液压油温偏高", message: "液压油温度接近警戒值", prob: 0.05 },
      { type: "warning" as const, category: "idle" as const, title: "长时间怠速", message: "设备怠速超过30分钟", prob: 0.04 },
      { type: "error" as const, category: "geofence" as const, title: "离开作业区域", message: "设备已离开指定作业区域", prob: 0.03 },
    ];
    
    for (const config of [...harvesters, ...tractors]) {
      for (const alertType of alertTypes) {
        if (Math.random() < alertType.prob) {
          const alertHour = randomInt(6, 22);
          const alertMinute = randomInt(0, 59);
          const alertTime = new Date(date);
          alertTime.setHours(alertHour, alertMinute, 0, 0);
          
          // 今天的警报不能超过当前时间
          if (isToday && alertTime > new Date()) continue;
          
          const isResolved = !isToday || Math.random() > 0.3;
          
          alerts.push({
            id: `alert-${config.id}-${day}-${alertType.category}-${Math.random().toString(36).substr(2, 9)}`,
            machineId: config.id,
            machineName: config.name,
            brand: config.brand,
            type: alertType.type,
            category: alertType.category,
            title: alertType.title,
            message: alertType.message,
            timestamp: alertTime,
            resolved: isResolved,
            resolvedAt: isResolved ? new Date(alertTime.getTime() + randomInt(10, 120) * 60000) : undefined
          });
        }
      }
    }
  }
  
  // 按时间排序警报
  alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return { logs, trajectories, alerts };
};

// 计算亩产统计
export const calculateYieldStats = (logs: DailyLog[]) => {
  const harvestLogs = logs.filter(log => log.workType === "收割");
  const totalArea = harvestLogs.reduce((sum, log) => sum + log.area, 0);
  const totalYield = harvestLogs.reduce((sum, log) => sum + log.yield, 0);
  const totalFuel = logs.reduce((sum, log) => sum + log.fuelConsumption, 0);
  
  return {
    totalArea: Math.round(totalArea),
    totalYield: Math.round(totalYield),
    avgYield: totalArea > 0 ? Math.round(totalYield / totalArea) : 0,
    totalFuel: Math.round(totalFuel),
    recordCount: logs.length
  };
};

// 导出生成的数据
const { logs: allLogs, trajectories: allTrajectories, alerts: allAlerts } = generateAllHistory();

export { allLogs, allTrajectories, allAlerts };
