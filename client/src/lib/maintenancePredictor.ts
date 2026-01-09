/**
 * 智能保养预测算法
 * 基于设备工作时长、作业强度和历史故障数据进行预测性维护
 */

// 保养计划类型定义
export interface MaintenancePlan {
  planType: string;
  planTypeName: string;
  intervalHours: number;
  lastServiceHours: number;
  estimatedCost: number;
}

// 设备信息类型定义
export interface MachineInfo {
  id: number;
  name: string;
  type: string;
  engineHours: number;
  status: string;
  lastMaintenanceDate?: Date;
}

// 历史保养记录类型定义
export interface MaintenanceLog {
  id: number;
  machineId: number;
  maintenanceType: string;
  maintenanceDate: Date;
  engineHoursAtMaintenance: number;
  totalCost: number;
  partsReplaced?: string;
}

// 作业记录类型定义
export interface WorkLog {
  machineId: number;
  startTime: Date;
  endTime?: Date;
  workArea: number;
  fuelConsumed: number;
}

// 预测结果类型定义
export interface PredictionResult {
  planType: string;
  planTypeName: string;
  currentHours: number;
  nextServiceHours: number;
  remainingHours: number;
  predictedDate: string;
  urgency: 'overdue' | 'urgent' | 'high' | 'medium' | 'low';
  estimatedCost: number;
  confidence: number; // 预测置信度 0-100
  factors: string[]; // 影响因素说明
}

// 健康评估结果类型定义
export interface HealthAssessment {
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  predictions: PredictionResult[];
  recommendations: string[];
  estimatedAnnualCost: number;
}

// 保养计划类型配置
const PLAN_TYPE_CONFIG: Record<string, { label: string; baseInterval: number; baseCost: number; priority: number }> = {
  oil_change: { label: "换机油", baseInterval: 250, baseCost: 800, priority: 1 },
  filter_replace: { label: "更换滤芯", baseInterval: 500, baseCost: 600, priority: 2 },
  belt_check: { label: "皮带检查", baseInterval: 1000, baseCost: 300, priority: 3 },
  brake_service: { label: "制动系统保养", baseInterval: 1500, baseCost: 1500, priority: 4 },
  hydraulic_service: { label: "液压系统保养", baseInterval: 2000, baseCost: 2000, priority: 5 },
  engine_overhaul: { label: "发动机大修", baseInterval: 5000, baseCost: 15000, priority: 6 },
  general_service: { label: "综合保养", baseInterval: 500, baseCost: 1200, priority: 2 },
};

// 设备类型系数（不同设备类型的保养频率调整）
const MACHINE_TYPE_FACTOR: Record<string, number> = {
  harvester: 1.2,  // 收割机工作强度大，保养更频繁
  tractor: 1.0,    // 拖拉机标准
  seeder: 0.9,     // 播种机相对轻负荷
  sprayer: 0.85,   // 喷药机负荷较轻
};

/**
 * 计算设备平均每日工作时长
 * @param workLogs 作业记录
 * @param days 统计天数
 * @returns 平均每日工作时长（小时）
 */
export function calculateAvgDailyHours(workLogs: WorkLog[], days: number = 30): number {
  if (workLogs.length === 0) return 8; // 默认假设每天8小时

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const recentLogs = workLogs.filter(log => 
    log.startTime >= startDate && log.endTime
  );

  if (recentLogs.length === 0) return 8;

  let totalHours = 0;
  recentLogs.forEach(log => {
    if (log.endTime) {
      const hours = (log.endTime.getTime() - log.startTime.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    }
  });

  // 计算实际工作天数
  const workDays = new Set(recentLogs.map(log => 
    log.startTime.toISOString().split('T')[0]
  )).size;

  return workDays > 0 ? totalHours / workDays : 8;
}

/**
 * 计算作业强度系数
 * 基于油耗、作业面积等指标评估设备工作强度
 * @param workLogs 作业记录
 * @returns 强度系数 (0.8 - 1.5)
 */
export function calculateIntensityFactor(workLogs: WorkLog[]): number {
  if (workLogs.length === 0) return 1.0;

  // 计算平均每小时油耗
  let totalFuel = 0;
  let totalHours = 0;

  workLogs.forEach(log => {
    if (log.endTime && log.fuelConsumed) {
      const hours = (log.endTime.getTime() - log.startTime.getTime()) / (1000 * 60 * 60);
      totalFuel += log.fuelConsumed;
      totalHours += hours;
    }
  });

  if (totalHours === 0) return 1.0;

  const avgFuelPerHour = totalFuel / totalHours;
  
  // 假设标准油耗为15L/h，根据实际油耗调整强度系数
  const standardFuelRate = 15;
  const intensityFactor = 0.8 + (avgFuelPerHour / standardFuelRate) * 0.4;
  
  return Math.max(0.8, Math.min(1.5, intensityFactor));
}

/**
 * 分析历史故障模式
 * @param maintenanceLogs 历史保养记录
 * @returns 故障风险系数
 */
export function analyzeFailurePatterns(maintenanceLogs: MaintenanceLog[]): number {
  if (maintenanceLogs.length === 0) return 1.0;

  // 统计维修类型的记录数量
  const repairCount = maintenanceLogs.filter(log => 
    log.maintenanceType === 'repair'
  ).length;

  const totalCount = maintenanceLogs.length;
  const repairRatio = repairCount / totalCount;

  // 维修比例越高，风险系数越大
  return 1.0 + repairRatio * 0.5;
}

/**
 * 预测下次保养时间
 * @param machine 设备信息
 * @param plan 保养计划
 * @param avgDailyHours 平均每日工作时长
 * @param intensityFactor 作业强度系数
 * @param failureRiskFactor 故障风险系数
 * @returns 预测结果
 */
export function predictNextMaintenance(
  machine: MachineInfo,
  plan: MaintenancePlan,
  avgDailyHours: number = 8,
  intensityFactor: number = 1.0,
  failureRiskFactor: number = 1.0
): PredictionResult {
  const machineTypeFactor = MACHINE_TYPE_FACTOR[machine.type] || 1.0;
  
  // 调整后的保养间隔
  const adjustedInterval = plan.intervalHours / (machineTypeFactor * intensityFactor * failureRiskFactor);
  
  // 计算下次保养工时
  const nextServiceHours = plan.lastServiceHours + adjustedInterval;
  
  // 计算剩余工时
  const remainingHours = nextServiceHours - machine.engineHours;
  
  // 计算预测日期
  const daysUntilService = remainingHours / avgDailyHours;
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + Math.max(0, Math.round(daysUntilService)));
  
  // 确定紧急程度
  let urgency: PredictionResult['urgency'] = 'low';
  if (remainingHours <= 0) urgency = 'overdue';
  else if (remainingHours <= 50) urgency = 'urgent';
  else if (remainingHours <= 100) urgency = 'high';
  else if (remainingHours <= 200) urgency = 'medium';
  
  // 计算置信度（基于数据质量）
  let confidence = 70; // 基础置信度
  if (avgDailyHours !== 8) confidence += 10; // 有实际工作数据
  if (intensityFactor !== 1.0) confidence += 10; // 有强度分析
  if (failureRiskFactor !== 1.0) confidence += 10; // 有故障分析
  confidence = Math.min(95, confidence);
  
  // 生成影响因素说明
  const factors: string[] = [];
  if (machineTypeFactor > 1) factors.push(`${machine.type}类型设备需更频繁保养`);
  if (intensityFactor > 1.1) factors.push('高强度作业，建议提前保养');
  if (failureRiskFactor > 1.2) factors.push('历史故障率较高，需重点关注');
  if (remainingHours < 0) factors.push('已超过建议保养时间');
  
  return {
    planType: plan.planType,
    planTypeName: plan.planTypeName,
    currentHours: machine.engineHours,
    nextServiceHours: Math.round(nextServiceHours),
    remainingHours: Math.round(remainingHours * 10) / 10,
    predictedDate: predictedDate.toISOString().split('T')[0],
    urgency,
    estimatedCost: plan.estimatedCost,
    confidence,
    factors,
  };
}

/**
 * 综合评估设备健康状态
 * @param machine 设备信息
 * @param plans 保养计划列表
 * @param maintenanceLogs 历史保养记录
 * @param workLogs 作业记录
 * @returns 健康评估结果
 */
export function assessMachineHealth(
  machine: MachineInfo,
  plans: MaintenancePlan[],
  maintenanceLogs: MaintenanceLog[] = [],
  workLogs: WorkLog[] = []
): HealthAssessment {
  // 计算各项系数
  const avgDailyHours = calculateAvgDailyHours(workLogs);
  const intensityFactor = calculateIntensityFactor(workLogs);
  const failureRiskFactor = analyzeFailurePatterns(maintenanceLogs);
  
  // 生成所有保养项目的预测
  const predictions = plans.map(plan => 
    predictNextMaintenance(machine, plan, avgDailyHours, intensityFactor, failureRiskFactor)
  );
  
  // 按紧急程度排序
  const urgencyOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
  predictions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  
  // 计算健康评分
  let score = 100;
  predictions.forEach(p => {
    if (p.urgency === 'overdue') score -= 25;
    else if (p.urgency === 'urgent') score -= 15;
    else if (p.urgency === 'high') score -= 10;
    else if (p.urgency === 'medium') score -= 5;
  });
  
  // 考虑故障风险因素
  if (failureRiskFactor > 1.3) score -= 10;
  else if (failureRiskFactor > 1.1) score -= 5;
  
  score = Math.max(0, Math.min(100, score));
  
  // 确定健康等级
  let level: HealthAssessment['level'] = 'excellent';
  if (score < 30) level = 'critical';
  else if (score < 50) level = 'poor';
  else if (score < 70) level = 'fair';
  else if (score < 85) level = 'good';
  
  // 生成建议
  const recommendations: string[] = [];
  const overdueItems = predictions.filter(p => p.urgency === 'overdue');
  const urgentItems = predictions.filter(p => p.urgency === 'urgent');
  
  if (overdueItems.length > 0) {
    recommendations.push(`立即安排${overdueItems.map(p => p.planTypeName).join('、')}保养`);
  }
  if (urgentItems.length > 0) {
    recommendations.push(`7天内完成${urgentItems.map(p => p.planTypeName).join('、')}`);
  }
  if (failureRiskFactor > 1.2) {
    recommendations.push('建议增加日常巡检频率，预防故障发生');
  }
  if (intensityFactor > 1.2) {
    recommendations.push('设备作业强度较高，建议适当缩短保养间隔');
  }
  if (recommendations.length === 0) {
    recommendations.push('设备状态良好，请继续保持定期保养');
  }
  
  // 估算年度保养费用
  const estimatedAnnualCost = predictions.reduce((sum, p) => {
    // 根据保养间隔计算年度次数
    const config = PLAN_TYPE_CONFIG[p.planType];
    if (!config) return sum;
    const annualTimes = (avgDailyHours * 365) / config.baseInterval;
    return sum + p.estimatedCost * annualTimes;
  }, 0);
  
  return {
    score,
    level,
    predictions,
    recommendations,
    estimatedAnnualCost: Math.round(estimatedAnnualCost),
  };
}

/**
 * 生成默认保养计划
 * @param machineType 设备类型
 * @param currentEngineHours 当前发动机工时
 * @returns 默认保养计划列表
 */
export function generateDefaultPlans(machineType: string, currentEngineHours: number): MaintenancePlan[] {
  const typeFactor = MACHINE_TYPE_FACTOR[machineType] || 1.0;
  
  return Object.entries(PLAN_TYPE_CONFIG).map(([type, config]) => {
    const adjustedInterval = Math.round(config.baseInterval / typeFactor);
    // 计算上次保养工时（假设按计划执行）
    const lastServiceHours = Math.floor(currentEngineHours / adjustedInterval) * adjustedInterval;
    
    return {
      planType: type,
      planTypeName: config.label,
      intervalHours: adjustedInterval,
      lastServiceHours,
      estimatedCost: config.baseCost,
    };
  });
}

/**
 * 格式化紧急程度显示
 */
export function formatUrgency(urgency: PredictionResult['urgency']): { label: string; color: string } {
  const config: Record<string, { label: string; color: string }> = {
    overdue: { label: '已逾期', color: 'text-red-600 bg-red-100' },
    urgent: { label: '紧急', color: 'text-orange-600 bg-orange-100' },
    high: { label: '较高', color: 'text-amber-600 bg-amber-100' },
    medium: { label: '中等', color: 'text-blue-600 bg-blue-100' },
    low: { label: '正常', color: 'text-green-600 bg-green-100' },
  };
  return config[urgency] || config.low;
}

/**
 * 格式化健康等级显示
 */
export function formatHealthLevel(level: HealthAssessment['level']): { label: string; color: string } {
  const config: Record<string, { label: string; color: string }> = {
    excellent: { label: '优秀', color: 'text-green-600' },
    good: { label: '良好', color: 'text-blue-600' },
    fair: { label: '一般', color: 'text-amber-600' },
    poor: { label: '较差', color: 'text-orange-600' },
    critical: { label: '危险', color: 'text-red-600' },
  };
  return config[level] || config.fair;
}
