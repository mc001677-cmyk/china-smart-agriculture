import { useState, useMemo, useRef, useEffect } from "react";
import { Tractor, Wrench, ChevronLeft, Search, ChevronRight, Fuel, Wheat, AlertTriangle, Clock, CheckCircle, Calendar, Plus, ChevronUp, ChevronDown, Truck, Activity, Gauge, Zap, Settings, BarChart3, Crown, Database, ShieldCheck as ShieldCheckIcon, UserCircle } from "lucide-react";
import { HarvesterIcon, GrainCartIcon, BrandLogoMini, BRAND_COLORS } from "./MachineIcons";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useFleet, MachineData } from "@/contexts/FleetContext";
import { BRAND_CONFIG } from "@/lib/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

// 苹果风格设计系统
const APPLE_DESIGN = {
  // 毛玻璃效果
  glass: "backdrop-blur-xl bg-white/80 dark:bg-black/80",
  glassSubtle: "backdrop-blur-md bg-white/60 dark:bg-black/60",
  // 圆角
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },
  // 阴影
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md shadow-black/5",
    lg: "shadow-lg shadow-black/10",
    xl: "shadow-xl shadow-black/15",
  },
  // 过渡动画
  transition: "transition-all duration-300 ease-out",
  // SF Pro 风格字体
  text: {
    title: "text-[17px] font-semibold tracking-tight",
    body: "text-[15px] font-normal",
    caption: "text-[13px] font-medium text-gray-500",
    small: "text-[11px] font-medium uppercase tracking-wider text-gray-400",
  },
};

// 品牌图标组件 - 使用品牌Logo Mini图标
const BrandIcon = ({ brand, size = 20 }: { brand: string; size?: number }) => {
  return <BrandLogoMini brand={brand} size={size} />;
};

// 设备类型图标 - 使用真实农机照片
const MachineTypeIcon = ({ type, status, brand, size = 36 }: { type: string; status: string; brand: string; size?: number }) => {
  const isActive = status === "working" || status === "moving";
  const statusColor = {
    作业中: "#34C759", // Apple Green
    moving: "#007AFF", // Apple Blue
    idle: "#FF9500",   // Apple Orange
    offline: "#8E8E93", // Apple Gray
  }[status] || "#8E8E93";
  
  // 获取品牌颜色
  const brandColors = BRAND_COLORS[brand as keyof typeof BRAND_COLORS] || BRAND_COLORS['john_deere'];
  
  // 获取真实农机照片URL
  const brandConfig = BRAND_CONFIG[brand as keyof typeof BRAND_CONFIG];
  const machineImage = type === "harvester" 
    ? brandConfig?.harvesterImage || '/images/machines/john_deere_harvester.jpg'
    : brandConfig?.tractorImage || '/images/machines/grain_cart.jpg';
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        APPLE_DESIGN.radius.lg,
        APPLE_DESIGN.transition,
      )}
      style={{ 
        width: size, 
        height: size,
        border: `2px solid ${brandColors?.primary || '#367C2B'}40`,
      }}
    >
      {/* 使用真实农机照片 */}
      <img 
        src={machineImage} 
        alt={`${brand} ${type}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          // 如果图片加载失败，显示SVG图标作为后备
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      {/* 后备SVG图标 */}
      <div className="hidden absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColors?.primary || '#367C2B'}15, ${brandColors?.primary || '#367C2B'}05)` }}>
        {type === "harvester" ? (
          <HarvesterIcon brand={brand} size={size * 0.85} />
        ) : (
          <GrainCartIcon brand={brand} size={size * 0.85} />
        )}
      </div>
      {/* 状态指示点 */}
      <div 
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
          isActive && "animate-pulse"
        )}
        style={{ backgroundColor: statusColor }}
      />
    </div>
  );
};

// 苹果风格进度条
const AppleProgressBar = ({ value, color, height = 4 }: { value: number; color: string; height?: number }) => (
  <div 
    className={cn("w-full bg-gray-200/50 overflow-hidden", APPLE_DESIGN.radius.full)}
    style={{ height }}
  >
    <div 
      className={cn(APPLE_DESIGN.transition, APPLE_DESIGN.radius.full)}
      style={{ 
        width: `${Math.min(100, Math.max(0, value))}%`, 
        height: '100%',
        backgroundColor: color,
      }}
    />
  </div>
);

// 苹果风格统计卡片
const StatCard = ({ icon: Icon, label, value, color, onClick }: { 
  icon: any; 
  label: string; 
  value: number | string; 
  color: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-3 min-w-[70px]",
      APPLE_DESIGN.radius.lg,
      APPLE_DESIGN.transition,
      "hover:scale-105 active:scale-95",
      "bg-gradient-to-b from-white to-gray-50/50",
      "border border-gray-200/50",
      APPLE_DESIGN.shadow.sm,
    )}
  >
    <Icon size={18} style={{ color }} strokeWidth={2} />
    <span className="text-lg font-bold mt-1" style={{ color }}>{value}</span>
    <span className={APPLE_DESIGN.text.small}>{label}</span>
  </button>
);

// 保养状态配置
const maintenanceStatusConfig = {
  overdue: { label: "已逾期", color: "#FF3B30", bgColor: "bg-red-50", borderColor: "border-red-200" },
  urgent: { label: "紧急", color: "#FF9500", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  warning: { label: "即将到期", color: "#FFCC00", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  normal: { label: "正常", color: "#34C759", bgColor: "bg-green-50", borderColor: "border-green-200" },
};

// 根据设备参数计算保养状态
function getMaintenanceStatus(machine: MachineData): keyof typeof maintenanceStatusConfig {
  const engineHealth = machine.params?.engineOilHealth || 100;
  const filterHealth = machine.params?.filterHealth || 100;
  const avgHealth = (engineHealth + filterHealth) / 2;
  
  if (avgHealth < 70) return "overdue";
  if (avgHealth < 80) return "urgent";
  if (avgHealth < 90) return "warning";
  return "normal";
}

// 苹果风格设备卡片
const MachineCard = ({ machine, isActive, onClick }: { 
  machine: MachineData; 
  isActive: boolean;
  onClick: () => void;
}) => {
  const brandConfig = BRAND_CONFIG[machine.brand as keyof typeof BRAND_CONFIG];
  const maintenanceStatus = getMaintenanceStatus(machine);
  const statusConfig = maintenanceStatusConfig[maintenanceStatus];
  
  const statusText = {
    working: "作业中",
    moving: "移动中",
    idle: "空闲",
    offline: "离线",
    off: "关机",
    power_on: "启动中",
  }[machine.status] || "未知";
  
  const statusColor = {
    working: "#34C759",
    moving: "#007AFF",
    idle: "#FF9500",
    offline: "#8E8E93",
    off: "#8E8E93",
    power_on: "#34C759",
  }[machine.status] || "#8E8E93";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 mb-2",
        APPLE_DESIGN.radius.lg,
        APPLE_DESIGN.transition,
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive 
          ? "bg-gradient-to-r from-blue-500/10 to-blue-400/5 border-blue-300 shadow-blue-100" 
          : "bg-white/80 border-gray-200/60 hover:border-gray-300",
        "border",
        APPLE_DESIGN.shadow.sm,
      )}
    >
      <div className="flex items-start gap-3">
        {/* 设备图标 - 使用品牌专属Mini图标 */}
        <MachineTypeIcon type={machine.type} status={machine.status} brand={machine.brand} size={44} />
        
        {/* 设备信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(APPLE_DESIGN.text.body, "font-semibold truncate")}>
              {machine.name}
            </span>
            {maintenanceStatus !== "normal" && (
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: statusConfig.color }}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <BrandIcon brand={machine.brand} size={16} />
            <span className={APPLE_DESIGN.text.caption}>{brandConfig?.name}</span>
            <span className="text-gray-300">•</span>
            <span 
              className={cn(APPLE_DESIGN.text.caption, "font-medium")}
              style={{ color: statusColor }}
            >
              {statusText}
            </span>
          </div>
          
          {/* 油量和负载 */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 flex-1">
              <Fuel size={12} className="text-gray-400" />
              <AppleProgressBar 
                value={machine.fuel} 
                color={machine.fuel < 20 ? "#FF3B30" : machine.fuel < 40 ? "#FF9500" : "#34C759"} 
              />
              <span className={cn(APPLE_DESIGN.text.small, "w-8 text-right")}>{Math.round(machine.fuel)}%</span>
            </div>
            {machine.status === "working" && machine.type === "harvester" && machine.load && (
              <div className="flex items-center gap-1.5 flex-1">
                <Gauge size={12} className="text-gray-400" />
                <AppleProgressBar value={machine.load} color="#007AFF" />
                <span className={cn(APPLE_DESIGN.text.small, "w-8 text-right")}>{Math.round(machine.load)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// 苹果风格导航按钮
const NavButton = ({ icon: Icon, label, isActive, badge, onClick }: {
  icon: any;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative w-11 h-11 flex items-center justify-center",
      APPLE_DESIGN.radius.lg,
      APPLE_DESIGN.transition,
      "hover:scale-110 active:scale-95",
      isActive 
        ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80",
    )}
    title={label}
  >
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    {badge && badge > 0 && (
      <div className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center",
        "bg-red-500 text-white text-[10px] font-bold",
        APPLE_DESIGN.radius.full,
        "border-2 border-white",
        "animate-pulse",
      )}>
        {badge > 99 ? "99+" : badge}
      </div>
    )}
  </button>
);

export default function CNHSidebar() {
  const [location, setLocation] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const [activeTab, setActiveTab] = useState("fleet");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "working" | "low_fuel" | "harvester" | "tractor">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { fleet, activeMachineId, setActiveMachineId } = useFleet();
  
  // 滚动相关状态
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // 检测滚动状态
  const checkScrollState = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollUp(container.scrollTop > 0);
      setCanScrollDown(container.scrollTop < container.scrollHeight - container.clientHeight - 1);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollState();
      container.addEventListener('scroll', checkScrollState);
      const resizeObserver = new ResizeObserver(checkScrollState);
      resizeObserver.observe(container);
      return () => {
        container.removeEventListener('scroll', checkScrollState);
        resizeObserver.disconnect();
      };
    }
  }, [activeTab, fleet]);

  // 滚动函数
  const scrollUp = () => {
    scrollContainerRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  };

  const scrollDown = () => {
    scrollContainerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  // 筛选和Search machines
  const filteredFleet = useMemo(() => {
    return fleet.filter(m => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!m.name.toLowerCase().includes(query) && !m.serial.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterStatus === "working" && m.status !== "working") return false;
      if (filterStatus === "low_fuel" && m.fuel >= 20) return false;
      if (filterStatus === "harvester" && m.type !== "harvester") return false;
      if (filterStatus === "tractor" && m.type !== "tractor") return false;
      return true;
    });
  }, [fleet, filterStatus, searchQuery]);

  // 按状态分组
  const groupedFleet = useMemo(() => {
    const workingMachines = filteredFleet.filter(m => m.status === "working");
    const moving = filteredFleet.filter(m => m.status === "moving");
    const idle = filteredFleet.filter(m => m.status === "idle" || m.status === "offline");
    return { working: workingMachines, moving, idle };
  }, [filteredFleet]);

  // 获取保养统计
  const maintenanceStats = useMemo(() => {
    let overdue = 0, urgent = 0, warning = 0;
    fleet.forEach(m => {
      const status = getMaintenanceStatus(m);
      if (status === "overdue") overdue++;
      else if (status === "urgent") urgent++;
      else if (status === "warning") warning++;
    });
    return { overdue, urgent, warning, total: overdue + urgent + warning };
  }, [fleet]);

  // 获取需要保养的设备列表
  const maintenanceTasks = useMemo(() => {
    return fleet
      .map(m => ({
        machine: m,
        status: getMaintenanceStatus(m),
        engineHealth: m.params?.engineOilHealth || 100,
        filterHealth: m.params?.filterHealth || 100,
      }))
      .filter(t => t.status !== "normal")
      .sort((a, b) => {
        const order = { overdue: 0, urgent: 1, warning: 2, normal: 3 };
        return order[a.status] - order[b.status];
      })
      .slice(0, 20);
  }, [fleet]);

  // 统计数据
  const workingCount = fleet.filter(m => m.status === "working").length;
  const movingCount = fleet.filter(m => m.status === "moving").length;
  const harvesterCount = fleet.filter(m => m.type === "harvester").length;
  const tractorCount = fleet.filter(m => m.type === "tractor").length;

  // 品牌统计
  const brandStats = useMemo(() => {
    const stats: Record<string, number> = {};
    fleet.forEach(m => {
      stats[m.brand] = (stats[m.brand] || 0) + 1;
    });
    return stats;
  }, [fleet]);

  return (
    <div className={cn(
      "flex h-full z-40 transition-all duration-500 ease-out relative pointer-events-auto",
      APPLE_DESIGN.shadow.xl,
    )}>
      {/* Level 1: 苹果风格图标导航栏 */}
      <div className={cn(
        "w-16 flex flex-col items-center py-5 gap-3 z-50",
        "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900",
        "border-r border-white/10",
      )}>
        {/* Logo */}
        <div className={cn(
          "w-10 h-10 flex items-center justify-center mb-4",
          APPLE_DESIGN.radius.lg,
          "bg-gradient-to-br from-green-400 to-green-600",
          APPLE_DESIGN.shadow.lg,
        )}>
          <Wheat size={22} className="text-white" strokeWidth={2.5} />
        </div>

        {/* 导航按钮 */}
        <NavButton 
          icon={Tractor} 
          label="机队管理" 
          isActive={activeTab === "fleet"}
          onClick={() => setActiveTab("fleet")}
        />
        
        <NavButton 
          icon={Wrench} 
          label="维保管理" 
          isActive={activeTab === "maintenance"}
          badge={maintenanceStats.total}
          onClick={() => setActiveTab("maintenance")}
        />
        
        <NavButton 
          icon={BarChart3} 
          label="数据分析" 
          isActive={activeTab === "analytics"}
          onClick={() => setActiveTab("analytics")}
        />
        
        <NavButton 
          icon={Settings} 
          label="设置" 
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />

        {/* 底部折叠按钮 */}
        <div className="flex-1" />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-8 h-8 flex items-center justify-center",
            APPLE_DESIGN.radius.full,
            APPLE_DESIGN.transition,
            "text-gray-400 hover:text-white hover:bg-white/10",
          )}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Level 2: 详情面板 - 苹果风格毛玻璃效果 */}
      <div className={cn(
        "overflow-hidden transition-all duration-500 ease-out",
        "bg-gradient-to-b from-gray-50/95 to-white/95",
        "backdrop-blur-xl",
        "border-r border-gray-200/50",
        isCollapsed ? "w-0" : "w-80",
      )}>
        <div className="w-80 h-full flex flex-col">
          {/* 面板头部 */}
          <div className={cn(
            "px-4 py-4 border-b border-gray-200/50",
            "bg-white/50",
          )}>
            <h2 className={cn(APPLE_DESIGN.text.title, "text-gray-900")}>
              {activeTab === "fleet" && "机队管理"}
              {activeTab === "maintenance" && "维保管理"}
              {activeTab === "analytics" && "数据分析"}
              {activeTab === "settings" && "系统设置"}
            </h2>
            <p className={cn(APPLE_DESIGN.text.caption, "mt-0.5")}>
              {activeTab === "fleet" && `${fleet.length} 台设备 · ${workingCount} 作业中`}
              {activeTab === "maintenance" && `${maintenanceStats.total} 项待处理`}
              {activeTab === "analytics" && "实时数据分析"}
              {activeTab === "settings" && "系统配置"}
            </p>
          </div>

          {/* 机队管理面板 */}
          {activeTab === "fleet" && (
            <>
              {/* 统计卡片 */}
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <StatCard icon={Activity} label="作业中" value={workingCount} color="#34C759" 
                    onClick={() => setFilterStatus(filterStatus === "working" ? "all" : "working")} />
                  <StatCard icon={Zap} label="移动中" value={movingCount} color="#007AFF" />
                  <StatCard icon={Wheat} label="收割机" value={harvesterCount} color="#FF9500"
                    onClick={() => setFilterStatus(filterStatus === "harvester" ? "all" : "harvester")} />
                  <StatCard icon={Truck} label="运粮车" value={tractorCount} color="#5856D6"
                    onClick={() => setFilterStatus(filterStatus === "tractor" ? "all" : "tractor")} />
                </div>
              </div>

              {/* Brands */}
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className={cn(APPLE_DESIGN.text.small, "mb-2")}>Brands</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(BRAND_CONFIG).map(([key, config]) => (
                    <div 
                      key={key}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1",
                        APPLE_DESIGN.radius.full,
                        "bg-white border border-gray-200/60",
                        APPLE_DESIGN.shadow.sm,
                      )}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className={APPLE_DESIGN.text.caption}>{config.name}</span>
                      <span className="text-[11px] font-bold text-gray-600">{brandStats[key] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 搜索栏 */}
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className={cn(
                  "relative flex items-center",
                  APPLE_DESIGN.radius.lg,
                  "bg-gray-100/80",
                  "border border-gray-200/50",
                )}>
                  <Search size={16} className="absolute left-3 text-gray-400" />
                  <Input
                    placeholder="搜索设备..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-9 pr-3 py-2 bg-transparent border-0",
                      "focus:ring-0 focus:outline-none",
                      APPLE_DESIGN.text.body,
                    )}
                  />
                </div>
              </div>

              {/* 设备列表 */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                {/* 上滚动指示器 */}
                {canScrollUp && (
                  <button
                    onClick={scrollUp}
                    className={cn(
                      "absolute top-0 left-0 right-0 h-8 z-10",
                      "bg-gradient-to-b from-white via-white/80 to-transparent",
                      "flex items-center justify-center",
                      APPLE_DESIGN.transition,
                      "hover:from-gray-100",
                    )}
                  >
                    <ChevronUp size={16} className="text-gray-400" />
                  </button>
                )}

                <div 
                  ref={scrollContainerRef}
                  className="h-full overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                >
                  {/* 作业中 */}
                  {groupedFleet.working.length > 0 && (
                    <div className="mb-4">
                      <div className={cn(APPLE_DESIGN.text.small, "mb-2 flex items-center gap-2")}>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        作业中 ({groupedFleet.working.length})
                      </div>
                      {groupedFleet.working.map(machine => (
                        <MachineCard
                          key={machine.id}
                          machine={machine}
                          isActive={activeMachineId === machine.id}
                          onClick={() => setActiveMachineId(machine.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 移动中 */}
                  {groupedFleet.moving.length > 0 && (
                    <div className="mb-4">
                      <div className={cn(APPLE_DESIGN.text.small, "mb-2 flex items-center gap-2")}>
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        移动中 ({groupedFleet.moving.length})
                      </div>
                      {groupedFleet.moving.map(machine => (
                        <MachineCard
                          key={machine.id}
                          machine={machine}
                          isActive={activeMachineId === machine.id}
                          onClick={() => setActiveMachineId(machine.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 空闲/离线 */}
                  {groupedFleet.idle.length > 0 && (
                    <div className="mb-4">
                      <div className={cn(APPLE_DESIGN.text.small, "mb-2 flex items-center gap-2")}>
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        空闲/离线 ({groupedFleet.idle.length})
                      </div>
                      {groupedFleet.idle.map(machine => (
                        <MachineCard
                          key={machine.id}
                          machine={machine}
                          isActive={activeMachineId === machine.id}
                          onClick={() => setActiveMachineId(machine.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 下滚动指示器 */}
                {canScrollDown && (
                  <button
                    onClick={scrollDown}
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-8 z-10",
                      "bg-gradient-to-t from-white via-white/80 to-transparent",
                      "flex items-center justify-center",
                      APPLE_DESIGN.transition,
                      "hover:from-gray-100",
                    )}
                  >
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* 维保管理面板 */}
          {activeTab === "maintenance" && (
            <>
              {/* 统计卡片 */}
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className="flex gap-2">
                  <StatCard icon={AlertTriangle} label="已逾期" value={maintenanceStats.overdue} color="#FF3B30" />
                  <StatCard icon={Clock} label="紧急" value={maintenanceStats.urgent} color="#FF9500" />
                  <StatCard icon={Calendar} label="即将到期" value={maintenanceStats.warning} color="#FFCC00" />
                </div>
              </div>

              {/* 快捷操作 */}
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className={cn(
                      "flex-1",
                      APPLE_DESIGN.radius.lg,
                      "bg-gradient-to-b from-blue-500 to-blue-600",
                      "hover:from-blue-600 hover:to-blue-700",
                      "text-white font-medium",
                      APPLE_DESIGN.shadow.md,
                    )}
                    onClick={() => toast.success("添加保养记录")}
                  >
                    <Plus size={16} className="mr-1" />
                    添加记录
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className={cn(
                      "flex-1",
                      APPLE_DESIGN.radius.lg,
                      "border-gray-300",
                      "hover:bg-gray-50",
                    )}
                    onClick={() => toast.info("查看保养日历")}
                  >
                    <Calendar size={16} className="mr-1" />
                    日历
                  </Button>
                </div>
              </div>

              {/* 待处理任务列表 */}
              <div className="relative flex-1 overflow-hidden">
                <div 
                  ref={scrollContainerRef}
                  className="h-full overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                >
                  {maintenanceTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <CheckCircle size={48} strokeWidth={1.5} />
                      <p className={cn(APPLE_DESIGN.text.body, "mt-3")}>所有设备保养状态良好</p>
                    </div>
                  ) : (
                    maintenanceTasks.map((task, index) => {
                      const config = maintenanceStatusConfig[task.status];
                      const brandConfig = BRAND_CONFIG[task.machine.brand as keyof typeof BRAND_CONFIG];
                      
                      return (
                        <div
                          key={task.machine.id}
                          className={cn(
                            "p-3 mb-2",
                            APPLE_DESIGN.radius.lg,
                            "bg-white border",
                            config.borderColor,
                            APPLE_DESIGN.shadow.sm,
                            APPLE_DESIGN.transition,
                            "hover:scale-[1.01]",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className={cn(
                                "w-10 h-10 flex items-center justify-center",
                                APPLE_DESIGN.radius.lg,
                              )}
                              style={{ backgroundColor: `${config.color}15` }}
                            >
                              <Wrench size={18} style={{ color: config.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(APPLE_DESIGN.text.body, "font-semibold truncate")}>
                                  {task.machine.name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    APPLE_DESIGN.radius.full,
                                  )}
                                  style={{ 
                                    color: config.color, 
                                    borderColor: config.color,
                                    backgroundColor: `${config.color}10`,
                                  }}
                                >
                                  {config.label}
                                </Badge>
                              </div>
                              <div className={cn(APPLE_DESIGN.text.caption, "mt-1")}>
                                {brandConfig?.name} · 机油健康度 {task.engineHealth}%
                              </div>
                              <div className="mt-2">
                                <AppleProgressBar 
                                  value={task.engineHealth} 
                                  color={config.color}
                                  height={3}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* 数据分析面板 */}
          {activeTab === "analytics" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
              <BarChart3 size={48} strokeWidth={1.5} />
              <p className={cn(APPLE_DESIGN.text.body, "mt-3 text-center")}>
                数据分析功能开发中
              </p>
              <p className={cn(APPLE_DESIGN.text.caption, "mt-1 text-center")}>
                敬请期待
              </p>
            </div>
          )}

          {/* 设置面板 */}
          {activeTab === "settings" && (
            <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
              <div className="flex items-center gap-2 text-gray-700 font-semibold">
                <Settings size={18} /> 系统设置
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setLocation(`${base}/onboarding`)}
                >
                  <Crown className="h-4 w-4 text-amber-600" />
                  会员中心 / 升级
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setLocation(`${base}/identity`)}
                >
                  <UserCircle className="h-4 w-4 text-emerald-600" />
                  身份与实名认证
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setLocation(`${base}/machine-register`)}
                >
                  <ShieldCheckIcon className="h-4 w-4 text-blue-600" />
                  设备注册与绑定
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setLocation(`${base}/fields`)}
                >
                  <Database className="h-4 w-4 text-indigo-600" />
                  目录数据 / 地块管理
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
