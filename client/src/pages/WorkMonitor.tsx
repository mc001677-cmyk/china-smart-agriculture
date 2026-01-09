import { useState, useEffect } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, Gauge, Fuel, Thermometer, Clock, MapPin, 
  Tractor, Wheat, TrendingUp, AlertTriangle, CheckCircle2,
  Droplets, Zap, Timer, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// Animated number component
const AnimatedValue = ({ value, decimals = 0 }: { value: number, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const step = (value - displayValue) * 0.15;
    if (Math.abs(value - displayValue) < 0.1) {
      setDisplayValue(value);
      return;
    }
    const timer = requestAnimationFrame(() => {
      setDisplayValue(prev => prev + step);
    });
    return () => cancelAnimationFrame(timer);
  }, [value, displayValue]);

  return <>{displayValue.toFixed(decimals)}</>;
};

// Status indicator component
const StatusIndicator = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: string; label: string }> = {
    working: { color: "bg-green-500", label: "作业中" },
    moving: { color: "bg-blue-500", label: "行驶中" },
    idle: { color: "bg-yellow-500", label: "怠速" },
    offline: { color: "bg-gray-400", label: "离线" },
    off: { color: "bg-gray-400", label: "关机" },
  };
  const config = statusConfig[status] || statusConfig.offline;
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", config.color)} />
      <span className="text-sm font-medium text-gray-600">{config.label}</span>
    </div>
  );
};

// Machine card component
const MachineMonitorCard = ({ machine, isActive, onClick }: { 
  machine: any; 
  isActive: boolean;
  onClick: () => void;
}) => {
  const isWorking = machine.status === 'working' || machine.status === 'moving';
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-xl border-l-4 card-hover",
        isActive ? "border-l-green-600 ring-2 ring-green-200 bg-gradient-to-br from-green-50 to-green-50/30 shadow-md" : "border-l-transparent hover:border-l-green-200",
        !isWorking && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{machine.name}</h3>
            <p className="text-xs text-gray-400 font-mono">{machine.serial}</p>
          </div>
          <StatusIndicator status={machine.status} />
        </div>
        
        {isWorking ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Gauge className="w-3 h-3" />
                <span className="text-[10px]">转速</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                <AnimatedValue value={machine.params.rpm} />
              </span>
              <span className="text-[10px] text-gray-400 ml-1">RPM</span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-[10px]">速度</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                <AnimatedValue value={machine.params.speed} decimals={1} />
              </span>
              <span className="text-[10px] text-gray-400 ml-1">km/h</span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Fuel className="w-3 h-3" />
                <span className="text-[10px]">油耗</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                <AnimatedValue value={machine.params.fuelRate} decimals={1} />
              </span>
              <span className="text-[10px] text-gray-400 ml-1">L/h</span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Zap className="w-3 h-3" />
                <span className="text-[10px]">负载</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                <AnimatedValue value={machine.load} />
              </span>
              <span className="text-[10px] text-gray-400 ml-1">%</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <Tractor className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">设备未在作业</p>
          </div>
        )}
        
        {/* Fuel & DEF Levels */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Fuel className="w-3 h-3 text-amber-500" />
            <Progress value={machine.fuel} className="flex-1 h-1.5" />
            <span className="text-xs text-gray-500 w-10 text-right">{machine.fuel.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-3 h-3 text-blue-500" />
            <Progress value={machine.def} className="flex-1 h-1.5" />
            <span className="text-xs text-gray-500 w-10 text-right">{machine.def.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Summary stats card
const SummaryCard = ({ icon: Icon, title, value, unit, trend, color }: {
  icon: any;
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  color: string;
}) => (
  <Card className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-300 border-0 card-hover">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-xl shadow-sm", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
            {trend >= 0 ? "+" : ""}{trend}%
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900 tracking-tight animate-count-up">
          {typeof value === 'number' ? <AnimatedValue value={value} decimals={1} /> : value}
          {unit && <span className="text-base font-medium text-gray-500 ml-1.5">{unit}</span>}
        </p>
        <p className="text-sm text-gray-500 mt-2 font-medium">{title}</p>
      </div>
    </CardContent>
  </Card>
);

export default function WorkMonitor() {
  const { fleet, activeMachineId, setActiveMachineId, globalStats, allLogs } = useFleet();
  const [selectedTab, setSelectedTab] = useState("all");
  
  const workingMachines = fleet.filter(m => m.status === 'working');
  const movingMachines = fleet.filter(m => m.status === 'moving');
  const idleMachines = fleet.filter(m => m.status === 'idle' || m.status === 'offline' || m.status === 'off');
  
  // Calculate today's stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = allLogs.filter(log => log.date === today);
  const todayArea = todayLogs.reduce((sum, log) => sum + log.area, 0);
  const todayYield = todayLogs.reduce((sum, log) => sum + log.yield, 0);
  const todayFuel = todayLogs.reduce((sum, log) => sum + log.fuelConsumption, 0);
  
  // Real-time totals from fleet
  const totalRPM = fleet.filter(m => m.status === 'working').reduce((sum, m) => sum + m.params.rpm, 0);
  const avgRPM = workingMachines.length > 0 ? totalRPM / workingMachines.length : 0;
  const totalFuelRate = fleet.filter(m => m.status === 'working' || m.status === 'moving').reduce((sum, m) => sum + m.params.fuelRate, 0);

  const getFilteredMachines = () => {
    switch (selectedTab) {
      case "working": return workingMachines;
      case "moving": return movingMachines;
      case "idle": return idleMachines;
      default: return fleet;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              作业监控
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              实时监控车队作业状态 · {format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-700">{workingMachines.length} 台作业中</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700">{movingMachines.length} 台行驶中</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 grid grid-cols-5 gap-4">
        <SummaryCard 
          icon={Target} 
          title="今日作业面积" 
          value={todayArea} 
          unit="亩"
          color="bg-green-500"
        />
        <SummaryCard 
          icon={Wheat} 
          title="今日收获量" 
          value={todayYield / 1000} 
          unit="吨"
          color="bg-amber-500"
        />
        <SummaryCard 
          icon={Fuel} 
          title="实时总油耗" 
          value={totalFuelRate} 
          unit="L/h"
          color="bg-red-500"
        />
        <SummaryCard 
          icon={Gauge} 
          title="平均转速" 
          value={avgRPM} 
          unit="RPM"
          color="bg-blue-500"
        />
        <SummaryCard 
          icon={TrendingUp} 
          title="秋收进度" 
          value={Math.round((allLogs.filter(log => log.workType === '收割').reduce((sum, log) => sum + log.area, 0) / 200000) * 100 * 10) / 10} 
          unit="%"
          trend={5}
          color="bg-purple-500"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">设备实时状态</CardTitle>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="all" className="text-xs">
                    全部 ({fleet.length})
                  </TabsTrigger>
                  <TabsTrigger value="working" className="text-xs">
                    作业中 ({workingMachines.length})
                  </TabsTrigger>
                  <TabsTrigger value="moving" className="text-xs">
                    行驶中 ({movingMachines.length})
                  </TabsTrigger>
                  <TabsTrigger value="idle" className="text-xs">
                    待命 ({idleMachines.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {getFilteredMachines().map(machine => (
                  <MachineMonitorCard 
                    key={machine.id}
                    machine={machine}
                    isActive={activeMachineId === machine.id}
                    onClick={() => setActiveMachineId(machine.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
