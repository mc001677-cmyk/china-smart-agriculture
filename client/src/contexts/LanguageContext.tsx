import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// 语言类型
export type Language = 'zh' | 'en';

// 翻译文本
const translations = {
  zh: {
    // 品牌
    brandName: '中国智慧农业平台',
    brandSubtitle: 'CHINA SMART AGRICULTURE PLATFORM',
    
    // 导航
    nav: {
      fleet: '机队管理',
      operations: '作业监控',
      trajectory: '轨迹回放',
      yield: '产量分析',
      marketplace: '作业交易',
      alerts: '智能警报',
    },
    
    // 侧边栏
    sidebar: {
      fleetManagement: '机队管理',
      maintenance: '维保管理',
      analytics: '数据分析',
      settings: '系统设置',
      machines: '台设备',
      working: '作业中',
      moving: '移动中',
      idle: '空闲',
      offline: '离线',
      harvester: '收割机',
      grainCart: '运粮车',
      searchPlaceholder: '搜索设备...',
      brands: '品牌',
      unknown: '未知',
    },
    
    // 地图
    map: {
      map: '地图',
      satellite: '卫星',
      yieldOverlay: '产量覆盖',
      legend: '图例',
      layersAndLegend: '图层与图例',
      machineStatus: '设备状态',
      fieldType: '地块类型',
      corn: '玉米',
      soybean: '大豆',
      yieldLegend: '产量图例',
      high: '高产',
      low: '低产',
    },
    
    // 设备详情
    device: {
      viewTrajectory: '查看历史轨迹',
      engineRpm: '发动机转速',
      workSpeed: '作业速度',
      waterTemp: '水温',
      fuelRate: '实时油耗',
      yieldRate: '实时产量',
      grainMoisture: '谷物水分',
      workedArea: '已作业面积',
      tractionLoad: '牵引负荷',
      healthScore: '综合健康度',
      engine: '发动机',
      hydraulic: '液压系统',
      transmission: '传动系统',
      electrical: '电气系统',
    },
    
    // 右侧面板
    panel: {
      harvestDashboard: '实时收获看板',
      todayHarvest: '今日收获',
      todayYield: '今日产量',
      avgYield: '平均产量',
      efficiency: '作业效率',
      acres: '亩',
      tons: '吨',
      kgPerAcre: 'kg/亩',
    },
    
    // 天气
    weather: {
      sunny: '晴',
      cloudy: '多云',
      rainy: '雨',
      humidity: '湿度',
    },
    
    // 通用
    common: {
      close: '关闭',
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      view: '查看',
      loading: '加载中...',
    },
  },
  en: {
    // 品牌
    brandName: 'Global Smart Agriculture',
    brandSubtitle: 'INTELLIGENT FARMING PLATFORM',
    
    // 导航
    nav: {
      fleet: 'Fleet',
      operations: 'Operations',
      trajectory: 'Trajectory',
      yield: 'Yield',
      marketplace: 'Marketplace',
      alerts: 'Alerts',
    },
    
    // 侧边栏
    sidebar: {
      fleetManagement: 'Fleet Management',
      maintenance: 'Maintenance',
      analytics: 'Analytics',
      settings: 'Settings',
      machines: 'machines',
      working: 'Working',
      moving: 'Moving',
      idle: 'Idle',
      offline: 'Offline',
      harvester: 'Harvester',
      grainCart: 'Grain Cart',
      searchPlaceholder: 'Search machines...',
      brands: 'Brands',
      unknown: 'Unknown',
    },
    
    // 地图
    map: {
      map: 'Map',
      satellite: 'Satellite',
      yieldOverlay: 'Yield Overlay',
      legend: 'Legend',
      layersAndLegend: 'Layers & Legend',
      machineStatus: 'Machine Status',
      fieldType: 'Field Type',
      corn: 'Corn',
      soybean: 'Soybean',
      yieldLegend: 'Yield Legend',
      high: 'High',
      low: 'Low',
    },
    
    // 设备详情
    device: {
      viewTrajectory: 'View Trajectory',
      engineRpm: 'Engine RPM',
      workSpeed: 'Work Speed',
      waterTemp: 'Water Temp',
      fuelRate: 'Fuel Rate',
      yieldRate: 'Yield Rate',
      grainMoisture: 'Grain Moisture',
      workedArea: 'Worked Area',
      tractionLoad: 'Traction Load',
      healthScore: 'Health Score',
      engine: 'Engine',
      hydraulic: 'Hydraulic',
      transmission: 'Transmission',
      electrical: 'Electrical',
    },
    
    // 右侧面板
    panel: {
      harvestDashboard: 'Harvest Dashboard',
      todayHarvest: 'Today Harvest',
      todayYield: 'Today Yield',
      avgYield: 'Avg Yield',
      efficiency: 'Efficiency',
      acres: 'acres',
      tons: 'tons',
      kgPerAcre: 'kg/acre',
    },
    
    // 天气
    weather: {
      sunny: 'Sunny',
      cloudy: 'Cloudy',
      rainy: 'Rainy',
      humidity: 'Humidity',
    },
    
    // 通用
    common: {
      close: 'Close',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      loading: 'Loading...',
    },
  },
};

type Translations = typeof translations.zh;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { translations };
