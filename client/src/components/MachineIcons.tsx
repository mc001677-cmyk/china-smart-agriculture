import React from 'react';
import { BRAND_CONFIG, getBrandInfo, getBrandInitial, getStatusColor, BrandId } from '@/lib/config';

/**
 * 农机图标组件库
 * 
 * 所有品牌配置从 config.ts 统一导入，确保单一数据源
 */

// 为了向后兼容，导出 BRAND_COLORS（从统一配置转换）
export const BRAND_COLORS = Object.fromEntries(
  Object.entries(BRAND_CONFIG).map(([key, value]) => [
    key,
    { primary: value.primary, secondary: value.secondary, name: value.name }
  ])
) as Record<string, { primary: string; secondary: string; name: string }>;

interface MachineIconProps {
  brand: string;
  type: 'harvester' | 'grain-cart';
  size?: number;
  className?: string;
}

// 收割机Mini图标
export const HarvesterIcon: React.FC<{ brand: string; size?: number; className?: string }> = ({ 
  brand, 
  size = 24,
  className = ''
}) => {
  const brandInfo = getBrandInfo(brand);
  const colors = { primary: brandInfo.primary, secondary: brandInfo.secondary };
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 收割机主体 */}
      <rect x="4" y="10" width="20" height="12" rx="2" fill={colors.primary} />
      {/* 驾驶室 */}
      <rect x="18" y="6" width="8" height="10" rx="1" fill={colors.primary} />
      {/* 驾驶室玻璃 */}
      <rect x="20" y="7" width="5" height="6" rx="0.5" fill="#87CEEB" opacity="0.8" />
      {/* 割台 */}
      <rect x="1" y="14" width="4" height="6" rx="1" fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5" />
      {/* 卸粮筒 */}
      <rect x="12" y="4" width="3" height="7" rx="0.5" fill={colors.primary} transform="rotate(-30 12 4)" />
      {/* 后轮 */}
      <circle cx="22" cy="22" r="4" fill="#333" />
      <circle cx="22" cy="22" r="2" fill="#666" />
      {/* 前轮 */}
      <circle cx="8" cy="22" r="3" fill="#333" />
      <circle cx="8" cy="22" r="1.5" fill="#666" />
      {/* 品牌标识点 */}
      <circle cx="14" cy="15" r="2" fill={colors.secondary} />
    </svg>
  );
};

// 运粮车Mini图标
export const GrainCartIcon: React.FC<{ brand: string; size?: number; className?: string }> = ({ 
  brand, 
  size = 24,
  className = ''
}) => {
  const brandInfo = getBrandInfo(brand);
  const colors = { primary: brandInfo.primary, secondary: brandInfo.secondary };
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 拖拉机头部 */}
      <rect x="2" y="12" width="10" height="10" rx="1" fill={colors.primary} />
      {/* 驾驶室 */}
      <rect x="4" y="8" width="6" height="6" rx="1" fill={colors.primary} />
      {/* 驾驶室玻璃 */}
      <rect x="5" y="9" width="4" height="4" rx="0.5" fill="#87CEEB" opacity="0.8" />
      {/* 粮仓 */}
      <path d="M14 8 L28 8 L30 20 L14 20 Z" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
      {/* 粮仓装饰线 */}
      <line x1="18" y1="8" x2="19" y2="20" stroke={colors.primary} strokeWidth="0.5" />
      <line x1="23" y1="8" x2="25" y2="20" stroke={colors.primary} strokeWidth="0.5" />
      {/* 拖拉机后轮 */}
      <circle cx="7" cy="22" r="4" fill="#333" />
      <circle cx="7" cy="22" r="2" fill="#666" />
      {/* 拖拉机前轮 */}
      <circle cx="3" cy="22" r="2" fill="#333" />
      <circle cx="3" cy="22" r="1" fill="#666" />
      {/* 粮仓轮子 */}
      <circle cx="22" cy="24" r="3" fill="#333" />
      <circle cx="22" cy="24" r="1.5" fill="#666" />
      <circle cx="28" cy="24" r="3" fill="#333" />
      <circle cx="28" cy="24" r="1.5" fill="#666" />
    </svg>
  );
};

// 通用设备图标组件
export const MachineIcon: React.FC<MachineIconProps> = ({ brand, type, size = 24, className = '' }) => {
  if (type === 'harvester') {
    return <HarvesterIcon brand={brand} size={size} className={className} />;
  }
  return <GrainCartIcon brand={brand} size={size} className={className} />;
};

// 地图标记图标（更小尺寸，带背景）
export const MapMarkerIcon: React.FC<{ 
  brand: string; 
  type: 'harvester' | 'grain-cart';
  status: 'working' | 'moving' | 'idle' | 'offline';
  size?: number;
}> = ({ brand, type, status, size = 32 }) => {
  const brandInfo = getBrandInfo(brand);
  const colors = { primary: brandInfo.primary, secondary: brandInfo.secondary };
  const statusColor = getStatusColor(status);
  
  return (
    <svg 
      width={size} 
      height={size + 8} 
      viewBox="0 0 40 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 标记底座阴影 */}
      <ellipse cx="20" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.2)" />
      
      {/* 标记主体 - 水滴形状 */}
      <path 
        d="M20 0 C8.954 0 0 8.954 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 8.954 31.046 0 20 0Z" 
        fill={statusColor}
      />
      
      {/* 内圈 */}
      <circle cx="20" cy="18" r="14" fill="white" />
      
      {/* 品牌色圈 */}
      <circle cx="20" cy="18" r="12" fill={colors.primary} />
      
      {/* 设备图标 */}
      <g transform="translate(8, 6)">
        {type === 'harvester' ? (
          <>
            {/* 简化收割机图标 */}
            <rect x="2" y="6" width="14" height="8" rx="1" fill="white" />
            <rect x="12" y="3" width="6" height="7" rx="0.5" fill="white" />
            <rect x="0" y="8" width="3" height="4" rx="0.5" fill={colors.secondary} />
            <circle cx="14" cy="16" r="3" fill="white" opacity="0.8" />
            <circle cx="5" cy="16" r="2" fill="white" opacity="0.8" />
          </>
        ) : (
          <>
            {/* 简化运粮车图标 */}
            <rect x="1" y="8" width="7" height="7" rx="0.5" fill="white" />
            <path d="M9 5 L20 5 L22 14 L9 14 Z" fill={colors.secondary} />
            <circle cx="5" cy="17" r="3" fill="white" opacity="0.8" />
            <circle cx="15" cy="17" r="2.5" fill="white" opacity="0.8" />
          </>
        )}
      </g>
      
      {/* 状态指示点 */}
      <circle cx="32" cy="8" r="5" fill={statusColor} stroke="white" strokeWidth="2" />
    </svg>
  );
};

// 生成地图标记的Data URL
export const getMapMarkerDataUrl = (
  brand: string, 
  type: 'harvester' | 'grain-cart',
  status: 'working' | 'moving' | 'idle' | 'offline'
): string => {
  const brandInfo = getBrandInfo(brand);
  const colors = { primary: brandInfo.primary, secondary: brandInfo.secondary };
  const statusColor = getStatusColor(status);
  
  const svgContent = type === 'harvester' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <ellipse cx="20" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
        <path d="M20 0 C8.954 0 0 8.954 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 8.954 31.046 0 20 0Z" fill="${statusColor}"/>
        <circle cx="20" cy="18" r="14" fill="white"/>
        <circle cx="20" cy="18" r="12" fill="${colors.primary}"/>
        <rect x="10" y="12" width="14" height="8" rx="1" fill="white"/>
        <rect x="20" y="9" width="6" height="7" rx="0.5" fill="white"/>
        <rect x="8" y="14" width="3" height="4" rx="0.5" fill="${colors.secondary}"/>
        <circle cx="22" cy="22" r="3" fill="white" opacity="0.8"/>
        <circle cx="13" cy="22" r="2" fill="white" opacity="0.8"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <ellipse cx="20" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
        <path d="M20 0 C8.954 0 0 8.954 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 8.954 31.046 0 20 0Z" fill="${statusColor}"/>
        <circle cx="20" cy="18" r="14" fill="white"/>
        <circle cx="20" cy="18" r="12" fill="${colors.primary}"/>
        <rect x="9" y="14" width="7" height="7" rx="0.5" fill="white"/>
        <path d="M17 11 L28 11 L30 20 L17 20 Z" fill="${colors.secondary}"/>
        <circle cx="13" cy="23" r="3" fill="white" opacity="0.8"/>
        <circle cx="23" cy="23" r="2.5" fill="white" opacity="0.8"/>
      </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

// 品牌Logo迷你图标
export const BrandLogoMini: React.FC<{ brand: string; size?: number }> = ({ brand, size = 16 }) => {
  const brandInfo = getBrandInfo(brand);
  const brandInitial = getBrandInitial(brand);
  
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" fill={brandInfo.primary} />
      <text 
        x="10" 
        y="14" 
        textAnchor="middle" 
        fill="white" 
        fontSize="8" 
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        {brandInitial}
      </text>
    </svg>
  );
};

export default MachineIcon;
