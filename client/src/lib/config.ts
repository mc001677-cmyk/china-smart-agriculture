/**
 * Smart Agriculture Platform - Unified Configuration
 * 
 * Location: Youyi Farm (友谊农场), Heilongjiang, China
 * Farm Size: 200,000 acres (approximately 81,000 hectares)
 * 
 * The coordinates are centered on Youyi Farm - one of the largest
 * state-owned farms in China, located in the Sanjiang Plain.
 * 
 * @author Jarvis
 * @version 3.1.0 - China Youyi Farm Edition
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Brand ID type */
export type BrandId = 'john_deere' | 'case_ih' | 'new_holland' | 'claas';

/** Machine type */
export type MachineType = 'harvester' | 'tractor';

/** Machine status */
export type MachineStatus = 'working' | 'moving' | 'idle' | 'offline';

/** Crop type */
export type CropType = 'corn' | 'soybean' | 'rice' | 'wheat';

/** Brand information */
export interface BrandInfo {
  id: BrandId;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  initial: string;
  harvesterImage: string;
  tractorImage: string;
}

/** Coordinate point */
export interface Coordinate {
  lat: number;
  lng: number;
}

/** Boundary */
export interface Boundary {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Farm field definition */
export interface FarmField {
  id: string;
  name: string;
  cropType: CropType;
  area: number;
  center: Coordinate;
  boundary: Coordinate[];
  zoneId: number;
}

// ============================================================================
// Farm Configuration - Youyi Farm, Heilongjiang, China
// ============================================================================

/**
 * 友谊农场地理配置
 * 
 * Location: Youyi Farm (友谊农场), Shuangyashan City, Heilongjiang Province, China
 * - Center: 46.85°N, 131.85°E (友谊县城附近)
 * - This region is in the Sanjiang Plain (三江平原), China's major grain production base
 * - Typical large-scale mechanized corn, soybean, and rice farming
 * 
 * Coverage: 200,000 acres = ~809 km² = ~28.4km x 28.4km
 * - Latitude range: ~0.26 degrees
 * - Longitude range: ~0.32 degrees (at 46.85°N)
 */
export const FARM_CONFIG = {
  /** Farm name */
  name: '友谊农场',
  
  /** Farm center coordinates - 友谊农场中心 */
  center: { lat: 46.85, lng: 131.85 } as Coordinate,
  
  /** Farm boundary (200,000 acres coverage) */
  boundary: {
    north: 46.98,
    south: 46.72,
    east: 132.01,
    west: 131.69
  } as Boundary,
  
  /** Total area (acres) */
  totalArea: 200000,
  
  /** Default map zoom level */
  defaultZoom: 12,
  
  /** Map center point (Leaflet/OpenLayers format: [lng, lat]) */
  get mapCenter(): [number, number] {
    return [this.center.lng, this.center.lat];
  }
} as const;

// ============================================================================
// Field Configuration - 4 zones within the farm
// ============================================================================

/**
 * 友谊农场地块布局
 * Divided into 4 operational zones across the 200,000 acre area
 * 
 * Layout:
 *   西北区(1)  |  东北区(2)
 *   --------------|---------------
 *   西南区(3)  |  东南区(4)
 * 
 * Division lines:
 * - Latitude: 46.85
 * - Longitude: 131.85
 */
export const FARM_FIELDS: FarmField[] = [
  // ===== 西北区 - 约翰迪尔作业区 =====
  {
    id: "field-nw",
    name: "西北作业区",
    cropType: "corn",
    area: 50000,
    center: { lat: 46.915, lng: 131.77 },
    boundary: [
      { lat: 46.98, lng: 131.69 },
      { lat: 46.98, lng: 131.85 },
      { lat: 46.85, lng: 131.85 },
      { lat: 46.85, lng: 131.69 }
    ],
    zoneId: 1
  },
  // ===== 东北区 - 凯斯作业区 =====
  {
    id: "field-ne",
    name: "东北作业区",
    cropType: "soybean",
    area: 50000,
    center: { lat: 46.915, lng: 131.93 },
    boundary: [
      { lat: 46.98, lng: 131.85 },
      { lat: 46.98, lng: 132.01 },
      { lat: 46.85, lng: 132.01 },
      { lat: 46.85, lng: 131.85 }
    ],
    zoneId: 2
  },
  // ===== 西南区 - 纽荷兰作业区 =====
  {
    id: "field-sw",
    name: "西南作业区",
    cropType: "rice",
    area: 50000,
    center: { lat: 46.785, lng: 131.77 },
    boundary: [
      { lat: 46.85, lng: 131.69 },
      { lat: 46.85, lng: 131.85 },
      { lat: 46.72, lng: 131.85 },
      { lat: 46.72, lng: 131.69 }
    ],
    zoneId: 3
  },
  // ===== 东南区 - 克拉斯作业区 =====
  {
    id: "field-se",
    name: "东南作业区",
    cropType: "wheat",
    area: 50000,
    center: { lat: 46.785, lng: 131.93 },
    boundary: [
      { lat: 46.85, lng: 131.85 },
      { lat: 46.85, lng: 132.01 },
      { lat: 46.72, lng: 132.01 },
      { lat: 46.72, lng: 131.85 }
    ],
    zoneId: 4
  }
];

/** Management zone configuration - 4 zones for 4 brands */
export const MANAGEMENT_ZONES = [
  { id: 1, name: "西北作业区", center: { lat: 46.915, lng: 131.77 }, brand: "john_deere" as BrandId },
  { id: 2, name: "东北作业区", center: { lat: 46.915, lng: 131.93 }, brand: "case_ih" as BrandId },
  { id: 3, name: "西南作业区", center: { lat: 46.785, lng: 131.77 }, brand: "new_holland" as BrandId },
  { id: 4, name: "东南作业区", center: { lat: 46.785, lng: 131.93 }, brand: "claas" as BrandId }
];

// ============================================================================
// Brand Configuration
// ============================================================================

export const BRAND_CONFIG: Record<BrandId, BrandInfo> = {
  john_deere: {
    id: 'john_deere',
    name: '约翰迪尔',
    nameEn: 'John Deere',
    primary: '#367C2B',
    secondary: '#FFDE00',
    initial: 'JD',
    harvesterImage: '/images/machines/john_deere_harvester.jpg',
    tractorImage: '/images/machines/grain_cart.jpg'
  },
  case_ih: {
    id: 'case_ih',
    name: '凯斯',
    nameEn: 'Case IH',
    primary: '#C8102E',
    secondary: '#FFFFFF',
    initial: 'CASE',
    harvesterImage: '/images/machines/case_ih_harvester.jpg',
    tractorImage: '/images/machines/grain_cart.jpg'
  },
  new_holland: {
    id: 'new_holland',
    name: '纽荷兰',
    nameEn: 'New Holland',
    primary: '#0033A0',
    secondary: '#FFFFFF',
    initial: 'NH',
    harvesterImage: '/images/machines/new_holland_harvester.jpg',
    tractorImage: '/images/machines/grain_cart.jpg'
  },
  claas: {
    id: 'claas',
    name: '克拉斯',
    nameEn: 'CLAAS',
    primary: '#8DC63F',
    secondary: '#333333',
    initial: 'CL',
    harvesterImage: '/images/machines/claas_harvester.jpg',
    tractorImage: '/images/machines/grain_cart.jpg'
  }
};

export function getBrandInfo(brandId: string): BrandInfo {
  return BRAND_CONFIG[brandId as BrandId] || BRAND_CONFIG.john_deere;
}

export function getBrandColor(brandId: string): { primary: string; secondary: string } {
  const brand = getBrandInfo(brandId);
  return { primary: brand.primary, secondary: brand.secondary };
}

export function getBrandInitial(brandId: string): string {
  return getBrandInfo(brandId).initial;
}

export function getMachineImage(brandId: string, type: MachineType): string {
  const brand = getBrandInfo(brandId);
  return type === 'harvester' ? brand.harvesterImage : brand.tractorImage;
}

// ============================================================================
// Status Configuration
// ============================================================================

export const STATUS_CONFIG: Record<MachineStatus, { color: string; bgColor: string; label: string }> = {
  working: { color: '#22C55E', bgColor: '#DCFCE7', label: '作业中' },
  moving: { color: '#3B82F6', bgColor: '#DBEAFE', label: '移动中' },
  idle: { color: '#F59E0B', bgColor: '#FEF3C7', label: '空闲' },
  offline: { color: '#6B7280', bgColor: '#F3F4F6', label: '离线' }
};

export function getStatusInfo(status: MachineStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.offline;
}

/**
 * Get status color for a machine
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'working':
      return '#22C55E'; // Green - Working
    case 'moving':
      return '#3B82F6'; // Blue - Moving
    case 'idle':
      return '#F59E0B'; // Yellow - Idle
    case 'offline':
      return '#6B7280'; // Gray - Offline
    default:
      return '#6B7280';
  }
}

// ============================================================================
// Machine Model Configuration
// ============================================================================

export const MACHINE_MODELS = {
  john_deere: {
    harvesters: ['S760', 'S770', 'S780'],
    tractors: ['9R Series']
  },
  case_ih: {
    harvesters: ['8250', '9250'],
    tractors: ['Magnum']
  },
  new_holland: {
    harvesters: ['CR9.90', 'CR10.90'],
    tractors: ['T9 Series']
  },
  claas: {
    harvesters: ['LEXION 770', 'LEXION 780'],
    tractors: ['XERION']
  }
};

// ============================================================================
// Fleet Configuration - v2.0 (10 machines)
// ============================================================================

/**
 * Fleet Configuration v2.0
 * 
 * Total 10 machines:
 * - Harvesters: 6 (John Deere 2, Case IH 2, New Holland 1, CLAAS 1)
 * - Grain Carts: 4 (1 per brand)
 */
export const FLEET_CONFIG = {
  john_deere: { harvesters: 2, tractors: 1 },  // 3 machines
  case_ih: { harvesters: 2, tractors: 1 },     // 3 machines
  new_holland: { harvesters: 1, tractors: 1 }, // 2 machines
  claas: { harvesters: 1, tractors: 1 }        // 2 machines
};

export const TOTAL_HARVESTERS = Object.values(FLEET_CONFIG).reduce((sum, b) => sum + b.harvesters, 0);
export const TOTAL_TRACTORS = Object.values(FLEET_CONFIG).reduce((sum, b) => sum + b.tractors, 0);
export const TOTAL_MACHINES = TOTAL_HARVESTERS + TOTAL_TRACTORS;

// ============================================================================
// Coordinate Generation Utilities
// ============================================================================

/**
 * Generate random coordinates within a specified zone
 */
export function generateCoordinateInZone(zoneId: number): Coordinate {
  const zone = MANAGEMENT_ZONES.find(z => z.id === zoneId);
  if (!zone) {
    return FARM_CONFIG.center;
  }
  
  // Random offset within zone (±0.03 degrees, ~3km)
  const latOffset = (Math.random() - 0.5) * 0.06;
  const lngOffset = (Math.random() - 0.5) * 0.06;
  
  // Ensure within farm boundary
  const lat = Math.max(
    FARM_CONFIG.boundary.south,
    Math.min(FARM_CONFIG.boundary.north, zone.center.lat + latOffset)
  );
  const lng = Math.max(
    FARM_CONFIG.boundary.west,
    Math.min(FARM_CONFIG.boundary.east, zone.center.lng + lngOffset)
  );
  
  return { lat, lng };
}

/**
 * Generate trajectory points (S-pattern)
 */
export function generateTrajectoryPoints(
  startLat: number,
  startLng: number,
  numPoints: number = 50
): Coordinate[] {
  const points: Coordinate[] = [];
  const rowWidth = 0.001; // ~100m row width
  const rowLength = 0.006; // ~600m row length
  
  let currentLat = startLat;
  let currentLng = startLng;
  let direction = 1; // 1: east, -1: west
  
  for (let i = 0; i < numPoints; i++) {
    points.push({ lat: currentLat, lng: currentLng });
    
    // Move along row
    currentLng += direction * (rowLength / 10);
    
    // End of row, switch direction
    if (i > 0 && i % 10 === 0) {
      currentLat -= rowWidth;
      direction *= -1;
    }
    
    // Ensure within boundary
    currentLat = Math.max(FARM_CONFIG.boundary.south, Math.min(FARM_CONFIG.boundary.north, currentLat));
    currentLng = Math.max(FARM_CONFIG.boundary.west, Math.min(FARM_CONFIG.boundary.east, currentLng));
  }
  
  return points;
}
