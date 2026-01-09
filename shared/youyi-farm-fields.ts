/**
 * 友谊农场地块配置
 * 基于真实地理坐标：46.77°N, 131.81°E
 * 
 * 友谊农场位于黑龙江省双鸭山市友谊县，三江平原腹地
 * 坐标范围：经度 131°27′~132°15′E，纬度 46°28′~46°50′N
 */

// 农场中心点坐标
export const FARM_CENTER = {
  lng: 131.81,
  lat: 46.77,
  name: "友谊农场中心"
};

// 农场边界范围（约20km x 15km的核心作业区）
export const FARM_BOUNDS = {
  minLng: 131.70,
  maxLng: 131.92,
  minLat: 46.68,
  maxLat: 46.86
};

// 地块类型
export type FieldType = 'corn' | 'soybean' | 'rice' | 'wheat';

// 地块定义
export interface FarmField {
  id: string;
  name: string;
  type: FieldType;
  area: number; // 亩
  center: { lng: number; lat: number };
  // 地块边界（多边形顶点，顺时针）
  boundary: Array<{ lng: number; lat: number }>;
  // 作业行方向（度数，0为正北）
  rowDirection: number;
  // 行间距（米）
  rowSpacing: number;
}

// 管理区定义
export interface ManagementZone {
  id: string;
  name: string;
  fields: FarmField[];
  center: { lng: number; lat: number };
}

/**
 * 友谊农场地块布局
 * 按照实际农场管理区划分，每个管理区包含多个地块
 */
export const FARM_FIELDS: FarmField[] = [
  // ===== 第一管理区（西北区域）=====
  {
    id: "field-1-1",
    name: "一分场1号地",
    type: "corn",
    area: 2800,
    center: { lng: 131.72, lat: 46.84 },
    boundary: [
      { lng: 131.70, lat: 46.86 },
      { lng: 131.74, lat: 46.86 },
      { lng: 131.74, lat: 46.82 },
      { lng: 131.70, lat: 46.82 }
    ],
    rowDirection: 0,
    rowSpacing: 0.65
  },
  {
    id: "field-1-2",
    name: "一分场2号地",
    type: "soybean",
    area: 2500,
    center: { lng: 131.76, lat: 46.84 },
    boundary: [
      { lng: 131.74, lat: 46.86 },
      { lng: 131.78, lat: 46.86 },
      { lng: 131.78, lat: 46.82 },
      { lng: 131.74, lat: 46.82 }
    ],
    rowDirection: 0,
    rowSpacing: 0.50
  },
  
  // ===== 第二管理区（东北区域）=====
  {
    id: "field-2-1",
    name: "二分场1号地",
    type: "corn",
    area: 3200,
    center: { lng: 131.82, lat: 46.84 },
    boundary: [
      { lng: 131.80, lat: 46.86 },
      { lng: 131.84, lat: 46.86 },
      { lng: 131.84, lat: 46.82 },
      { lng: 131.80, lat: 46.82 }
    ],
    rowDirection: 5,
    rowSpacing: 0.65
  },
  {
    id: "field-2-2",
    name: "二分场2号地",
    type: "soybean",
    area: 2900,
    center: { lng: 131.88, lat: 46.84 },
    boundary: [
      { lng: 131.86, lat: 46.86 },
      { lng: 131.90, lat: 46.86 },
      { lng: 131.90, lat: 46.82 },
      { lng: 131.86, lat: 46.82 }
    ],
    rowDirection: 0,
    rowSpacing: 0.50
  },
  
  // ===== 第三管理区（中西区域）=====
  {
    id: "field-3-1",
    name: "三分场1号地",
    type: "corn",
    area: 3500,
    center: { lng: 131.72, lat: 46.78 },
    boundary: [
      { lng: 131.70, lat: 46.80 },
      { lng: 131.74, lat: 46.80 },
      { lng: 131.74, lat: 46.76 },
      { lng: 131.70, lat: 46.76 }
    ],
    rowDirection: 90,
    rowSpacing: 0.65
  },
  {
    id: "field-3-2",
    name: "三分场2号地",
    type: "rice",
    area: 2200,
    center: { lng: 131.76, lat: 46.78 },
    boundary: [
      { lng: 131.74, lat: 46.80 },
      { lng: 131.78, lat: 46.80 },
      { lng: 131.78, lat: 46.76 },
      { lng: 131.74, lat: 46.76 }
    ],
    rowDirection: 0,
    rowSpacing: 0.30
  },
  
  // ===== 第四管理区（中心区域）=====
  {
    id: "field-4-1",
    name: "四分场1号地",
    type: "corn",
    area: 4000,
    center: { lng: 131.82, lat: 46.78 },
    boundary: [
      { lng: 131.80, lat: 46.80 },
      { lng: 131.84, lat: 46.80 },
      { lng: 131.84, lat: 46.76 },
      { lng: 131.80, lat: 46.76 }
    ],
    rowDirection: 0,
    rowSpacing: 0.65
  },
  {
    id: "field-4-2",
    name: "四分场2号地",
    type: "soybean",
    area: 3100,
    center: { lng: 131.88, lat: 46.78 },
    boundary: [
      { lng: 131.86, lat: 46.80 },
      { lng: 131.90, lat: 46.80 },
      { lng: 131.90, lat: 46.76 },
      { lng: 131.86, lat: 46.76 }
    ],
    rowDirection: 0,
    rowSpacing: 0.50
  },
  
  // ===== 第五管理区（西南区域）=====
  {
    id: "field-5-1",
    name: "五分场1号地",
    type: "corn",
    area: 2600,
    center: { lng: 131.72, lat: 46.72 },
    boundary: [
      { lng: 131.70, lat: 46.74 },
      { lng: 131.74, lat: 46.74 },
      { lng: 131.74, lat: 46.70 },
      { lng: 131.70, lat: 46.70 }
    ],
    rowDirection: 0,
    rowSpacing: 0.65
  },
  {
    id: "field-5-2",
    name: "五分场2号地",
    type: "soybean",
    area: 2400,
    center: { lng: 131.76, lat: 46.72 },
    boundary: [
      { lng: 131.74, lat: 46.74 },
      { lng: 131.78, lat: 46.74 },
      { lng: 131.78, lat: 46.70 },
      { lng: 131.74, lat: 46.70 }
    ],
    rowDirection: 0,
    rowSpacing: 0.50
  },
  
  // ===== 第六管理区（东南区域）=====
  {
    id: "field-6-1",
    name: "六分场1号地",
    type: "corn",
    area: 3800,
    center: { lng: 131.82, lat: 46.72 },
    boundary: [
      { lng: 131.80, lat: 46.74 },
      { lng: 131.84, lat: 46.74 },
      { lng: 131.84, lat: 46.70 },
      { lng: 131.80, lat: 46.70 }
    ],
    rowDirection: 0,
    rowSpacing: 0.65
  },
  {
    id: "field-6-2",
    name: "六分场2号地",
    type: "rice",
    area: 2000,
    center: { lng: 131.88, lat: 46.72 },
    boundary: [
      { lng: 131.86, lat: 46.74 },
      { lng: 131.90, lat: 46.74 },
      { lng: 131.90, lat: 46.70 },
      { lng: 131.86, lat: 46.70 }
    ],
    rowDirection: 0,
    rowSpacing: 0.30
  }
];

// 管理区汇总
export const MANAGEMENT_ZONES: ManagementZone[] = [
  {
    id: "zone-1",
    name: "第一管理区",
    center: { lng: 131.74, lat: 46.84 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-1"))
  },
  {
    id: "zone-2",
    name: "第二管理区",
    center: { lng: 131.86, lat: 46.84 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-2"))
  },
  {
    id: "zone-3",
    name: "第三管理区",
    center: { lng: 131.74, lat: 46.78 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-3"))
  },
  {
    id: "zone-4",
    name: "第四管理区",
    center: { lng: 131.86, lat: 46.78 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-4"))
  },
  {
    id: "zone-5",
    name: "第五管理区",
    center: { lng: 131.74, lat: 46.72 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-5"))
  },
  {
    id: "zone-6",
    name: "第六管理区",
    center: { lng: 131.86, lat: 46.72 },
    fields: FARM_FIELDS.filter(f => f.id.startsWith("field-6"))
  }
];

// 计算总面积
export const TOTAL_FARM_AREA = FARM_FIELDS.reduce((sum, field) => sum + field.area, 0);

/**
 * 在地块内生成随机位置
 */
export function getRandomPositionInField(field: FarmField): { lng: number; lat: number } {
  const bounds = field.boundary;
  const minLng = Math.min(...bounds.map(p => p.lng));
  const maxLng = Math.max(...bounds.map(p => p.lng));
  const minLat = Math.min(...bounds.map(p => p.lat));
  const maxLat = Math.max(...bounds.map(p => p.lat));
  
  return {
    lng: minLng + Math.random() * (maxLng - minLng),
    lat: minLat + Math.random() * (maxLat - minLat)
  };
}

/**
 * 在农场范围内生成随机位置
 */
export function getRandomPositionInFarm(): { lng: number; lat: number } {
  return {
    lng: FARM_BOUNDS.minLng + Math.random() * (FARM_BOUNDS.maxLng - FARM_BOUNDS.minLng),
    lat: FARM_BOUNDS.minLat + Math.random() * (FARM_BOUNDS.maxLat - FARM_BOUNDS.minLat)
  };
}

/**
 * 生成S形作业轨迹点
 * @param field 地块
 * @param progress 作业进度 0-1
 * @param rowsCompleted 已完成的行数
 */
export function generateHarvestPath(
  field: FarmField,
  totalRows: number = 20
): Array<{ lng: number; lat: number; progress: number }> {
  const bounds = field.boundary;
  const minLng = Math.min(...bounds.map(p => p.lng));
  const maxLng = Math.max(...bounds.map(p => p.lng));
  const minLat = Math.min(...bounds.map(p => p.lat));
  const maxLat = Math.max(...bounds.map(p => p.lat));
  
  const path: Array<{ lng: number; lat: number; progress: number }> = [];
  const rowWidth = (maxLng - minLng) / totalRows;
  
  for (let row = 0; row < totalRows; row++) {
    const lng = minLng + row * rowWidth + rowWidth / 2;
    const isEvenRow = row % 2 === 0;
    
    // 每行生成多个点
    const pointsPerRow = 10;
    for (let i = 0; i < pointsPerRow; i++) {
      const latProgress = i / (pointsPerRow - 1);
      const lat = isEvenRow 
        ? minLat + latProgress * (maxLat - minLat)
        : maxLat - latProgress * (maxLat - minLat);
      
      const overallProgress = (row * pointsPerRow + i) / (totalRows * pointsPerRow);
      
      path.push({
        lng: lng + (Math.random() - 0.5) * 0.001, // 添加小随机偏移
        lat: lat + (Math.random() - 0.5) * 0.001,
        progress: overallProgress
      });
    }
  }
  
  return path;
}

/**
 * 根据时间获取设备在轨迹上的位置
 */
export function getPositionOnPath(
  path: Array<{ lng: number; lat: number; progress: number }>,
  progress: number
): { lng: number; lat: number } {
  if (path.length === 0) return { lng: 0, lat: 0 };
  if (progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];
  
  // 找到进度对应的位置
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].progress <= progress && path[i + 1].progress > progress) {
      const segmentProgress = (progress - path[i].progress) / (path[i + 1].progress - path[i].progress);
      return {
        lng: path[i].lng + segmentProgress * (path[i + 1].lng - path[i].lng),
        lat: path[i].lat + segmentProgress * (path[i + 1].lat - path[i].lat)
      };
    }
  }
  
  return path[path.length - 1];
}
