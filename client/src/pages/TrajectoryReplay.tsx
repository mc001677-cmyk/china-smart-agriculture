import { useState, useEffect, useRef, useCallback } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Pause, SkipBack, SkipForward, Calendar, MapPin, 
  Clock, Route, Gauge, Fuel, ChevronLeft, ChevronRight,
  Maximize2, Download, Share2, Layers, Activity, Wheat,
  Droplets, Thermometer, TrendingUp, BarChart3, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { DailyTrajectory, TrajectoryPoint } from "@/lib/historyGenerator";
import { FARM_CONFIG, getBrandInfo } from "@/lib/config";

// Playback speed options - 参考迪尔智联
const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 4, label: "4x" },
  { value: 8, label: "8x" },
  { value: 16, label: "16x" },
];

// 轨迹颜色方案 - 根据产量/速度渐变
const TRAJECTORY_COLORS = {
  yield: {
    low: '#ef4444',      // 红色 - 低产量
    medium: '#f59e0b',   // 橙色 - 中等产量
    high: '#22c55e',     // 绿色 - 高产量
    veryHigh: '#367C2B', // 迪尔绿 - 极高产量
  },
  speed: {
    slow: '#3b82f6',     // 蓝色 - 慢速
    normal: '#22c55e',   // 绿色 - 正常
    fast: '#f59e0b',     // 橙色 - 快速
  },
  status: {
    working: '#367C2B',  // 迪尔绿 - 作业中
    turning: '#FFDE00',  // 迪尔黄 - 转弯
    idle: '#9CA3AF',     // 灰色 - 怠速
  }
};

// Machine selector component - 优化样式
const MachineSelector = ({ machines, selectedId, onSelect }: {
  machines: any[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) => (
  <div className="space-y-2">
    {machines.map(machine => {
      const brandInfo = getBrandInfo(machine.brand);
      return (
        <div
          key={machine.id}
          className={cn(
            "p-3 rounded-lg cursor-pointer transition-all border group",
            selectedId === machine.id 
              ? "bg-green-50 border-green-400 shadow-md ring-1 ring-green-400" 
              : "bg-white border-gray-200 hover:border-green-300 hover:shadow-sm"
          )}
          onClick={() => onSelect(machine.id)}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-transform group-hover:scale-105",
              machine.type === "harvester" ? "bg-amber-100" : "bg-blue-100"
            )}>
              {machine.type === "harvester" ? "🌾" : "🚜"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate">{machine.name}</p>
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5"
                  style={{ borderColor: brandInfo.primary, color: brandInfo.primary }}
                >
                  {brandInfo.name}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{machine.serial}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={machine.status === 'working' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {machine.status === 'working' ? '作业中' : machine.status === 'moving' ? '行驶中' : '离线'}
                </Badge>
                <span className="text-xs text-gray-400">
                  {machine.type === 'harvester' ? '收割机' : '运粮车'}
                </span>
              </div>
            </div>
            {selectedId === machine.id && (
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// Date selector component - 优化交互
const DateSelector = ({ selectedDate, onDateChange, availableDates }: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  availableDates: string[];
}) => {
  const canGoPrev = availableDates.some(d => new Date(d) < selectedDate);
  const canGoNext = availableDates.some(d => new Date(d) > selectedDate);

  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 rounded-lg hover:bg-green-50"
        disabled={!canGoPrev}
        onClick={() => {
          const prevDates = availableDates.filter(d => new Date(d) < selectedDate);
          if (prevDates.length > 0) {
            onDateChange(new Date(prevDates[prevDates.length - 1]));
          }
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-2 px-4 py-1">
        <Calendar className="w-4 h-4 text-green-600" />
        <div className="text-center">
          <span className="font-bold text-gray-900 text-lg">
            {format(selectedDate, 'MM月dd日', { locale: zhCN })}
          </span>
          <span className="text-sm text-gray-400 ml-2">
            {format(selectedDate, 'EEEE', { locale: zhCN })}
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 rounded-lg hover:bg-green-50"
        disabled={!canGoNext}
        onClick={() => {
          const nextDates = availableDates.filter(d => new Date(d) > selectedDate);
          if (nextDates.length > 0) {
            onDateChange(new Date(nextDates[0]));
          }
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

// 实时数据面板 - 参考迪尔智联设计
const RealtimeDataPanel = ({ currentPoint, machine }: {
  currentPoint: TrajectoryPoint | null;
  machine: any;
}) => {
  if (!currentPoint) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">播放轨迹查看实时数据</p>
      </div>
    );
  }

  const dataItems = [
    { 
      icon: Gauge, 
      label: '作业速度', 
      value: `${currentPoint.speed?.toFixed(1) || '0.0'}`, 
      unit: 'km/h',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      icon: Zap, 
      label: '发动机转速', 
      value: `${Math.round(currentPoint.rpm || 0)}`, 
      unit: 'RPM',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      icon: Wheat, 
      label: '实时产量', 
      value: `${(Math.random() * 200 + 500).toFixed(0)}`, 
      unit: 'kg/亩',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      icon: Droplets, 
      label: '谷物水分', 
      value: `${(Math.random() * 3 + 13).toFixed(1)}`, 
      unit: '%',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    { 
      icon: Fuel, 
      label: '实时油耗', 
      value: `${(Math.random() * 20 + 50).toFixed(1)}`, 
      unit: 'L/h',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    { 
      icon: Thermometer, 
      label: '水温', 
      value: `${(Math.random() * 10 + 82).toFixed(0)}`, 
      unit: '°C',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {dataItems.map((item, index) => (
        <div 
          key={index} 
          className={cn("rounded-lg p-3 transition-all hover:shadow-sm", item.bgColor)}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-xl font-bold", item.color)}>{item.value}</span>
            <span className="text-xs text-gray-400">{item.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 轨迹统计面板
const TrajectoryStats = ({ trajectory, dailyLog }: {
  trajectory: DailyTrajectory | null;
  dailyLog: any;
}) => {
  if (!trajectory || !dailyLog) {
    return (
      <div className="text-center py-6 text-gray-400">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">选择设备查看统计数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 作业进度 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">当日作业进度</span>
          <span className="text-sm font-bold text-green-600">
            {((dailyLog.area / 500) * 100).toFixed(0)}%
          </span>
        </div>
        <Progress value={(dailyLog.area / 500) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>已完成 {dailyLog.area} 亩</span>
          <span>目标 500 亩</span>
        </div>
      </div>

      {/* 统计数据网格 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">作业时长</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyLog.duration}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">作业面积</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyLog.area} <span className="text-sm font-normal">亩</span></p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Gauge className="w-4 h-4" />
            <span className="text-xs">平均速度</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyLog.avgSpeed} <span className="text-sm font-normal">km/h</span></p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">作业效率</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyLog.efficiency} <span className="text-sm font-normal">亩/h</span></p>
        </div>
      </div>

      {/* 燃油消耗 */}
      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-gray-700">燃油消耗</span>
          </div>
          <span className="text-2xl font-bold text-orange-600">{dailyLog.fuelConsumption} <span className="text-sm font-normal">L</span></span>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          平均油耗: {(dailyLog.fuelConsumption / parseFloat(dailyLog.duration)).toFixed(1)} L/h
        </div>
      </div>
    </div>
  );
};

// 高德地图轨迹可视化组件
const AMapTrajectoryView = ({ 
  trajectory, 
  currentIndex, 
  colorMode,
  machine
}: {
  trajectory: DailyTrajectory | null;
  currentIndex: number;
  colorMode: 'yield' | 'speed' | 'status';
  machine: any;
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (!window.AMap) {
        setTimeout(initMap, 100);
        return;
      }

      const AMap = window.AMap;
      const map = new AMap.Map(mapContainerRef.current, {
        zoom: 15,
        center: FARM_CONFIG.mapCenter,
        layers: [
          new AMap.TileLayer.Satellite(),
          new AMap.TileLayer.RoadNet({ opacity: 0.3 })
        ],
        viewMode: '2D',
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 更新轨迹显示
  useEffect(() => {
    if (!mapInstanceRef.current || !trajectory || !window.AMap) return;

    const AMap = window.AMap;
    const map = mapInstanceRef.current;

    // 清除旧的轨迹和标记
    if (polylineRef.current) {
      map.remove(polylineRef.current);
      polylineRef.current = null;
    }
    if (markerRef.current) {
      map.remove(markerRef.current);
      markerRef.current = null;
    }

    // 绘制完整轨迹（灰色底层）
    const fullPath = trajectory.path;
    const fullPolyline = new AMap.Polyline({
      path: fullPath,
      strokeColor: '#d1d5db',
      strokeWeight: trajectory.swathWidth * 1.2,
      strokeOpacity: 0.3,
      lineJoin: 'round',
      lineCap: 'round',
    });
    map.add(fullPolyline);

    // 绘制已播放轨迹（彩色）
    const visiblePath = fullPath.slice(0, Math.max(2, currentIndex + 1));
    
    // 根据颜色模式选择颜色
    let strokeColor = TRAJECTORY_COLORS.status.working;
    if (colorMode === 'yield') {
      strokeColor = TRAJECTORY_COLORS.yield.high;
    } else if (colorMode === 'speed') {
      strokeColor = TRAJECTORY_COLORS.speed.normal;
    }

    const visiblePolyline = new AMap.Polyline({
      path: visiblePath,
      strokeColor: strokeColor,
      strokeWeight: trajectory.swathWidth * 1.5,
      strokeOpacity: 0.7,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 100,
    });
    map.add(visiblePolyline);
    polylineRef.current = visiblePolyline;

    // 绘制当前位置标记
    if (currentIndex < fullPath.length) {
      const currentPos = fullPath[currentIndex];
      
      // 创建自定义标记
      const markerContent = `
        <div style="
          width: 40px; 
          height: 40px; 
          background: linear-gradient(135deg, #367C2B 0%, #22c55e 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          animation: pulse 2s infinite;
        ">
          ${machine?.type === 'harvester' ? '🌾' : '🚜'}
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `;

      const marker = new AMap.Marker({
        position: currentPos,
        content: markerContent,
        offset: new AMap.Pixel(-20, -20),
        zIndex: 200,
      });
      map.add(marker);
      markerRef.current = marker;

      // 平滑移动地图中心
      map.panTo(currentPos);
    }

    // 调整视野以包含整个轨迹
    if (currentIndex === 0) {
      map.setFitView([fullPolyline], false, [50, 50, 50, 50]);
    }

  }, [trajectory, currentIndex, colorMode, machine]);

  return (
    <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
  );
};

// 播放控制栏 - 参考迪尔智联优化
const PlaybackControls = ({
  isPlaying,
  setIsPlaying,
  currentIndex,
  setCurrentIndex,
  totalPoints,
  playbackSpeed,
  setPlaybackSpeed,
  currentTime,
  startTime,
  endTime,
}: {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  currentIndex: number;
  setCurrentIndex: (v: number) => void;
  totalPoints: number;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  currentTime: string;
  startTime: string;
  endTime: string;
}) => {
  return (
    <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="flex items-center gap-6">
        {/* 当前时间显示 */}
        <div className="w-28 text-center bg-gray-900 rounded-lg py-2 px-3">
          <span className="text-2xl font-mono font-bold text-green-400">
            {currentTime || "--:--"}
          </span>
        </div>
        
        {/* 控制按钮组 */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setCurrentIndex(0)}
            disabled={totalPoints === 0}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            variant={isPlaying ? "secondary" : "default"}
            size="icon"
            className={cn(
              "w-14 h-14 rounded-full transition-all",
              isPlaying 
                ? "bg-amber-500 hover:bg-amber-600" 
                : "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={totalPoints === 0}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setCurrentIndex(Math.max(0, totalPoints - 1))}
            disabled={totalPoints === 0}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 进度条 */}
        <div className="flex-1 px-4">
          <Slider
            value={[currentIndex]}
            max={Math.max(1, totalPoints - 1)}
            step={1}
            onValueChange={(v) => {
              setCurrentIndex(v[0]);
              setIsPlaying(false);
            }}
            disabled={totalPoints === 0}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span className="font-mono">{startTime || "07:00"}</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>已播放 {totalPoints > 0 ? ((currentIndex / (totalPoints - 1)) * 100).toFixed(0) : 0}%</span>
            </div>
            <span className="font-mono">{endTime || "17:00"}</span>
          </div>
        </div>
        
        {/* 速度选择器 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">播放速度</span>
          <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
            <SelectTrigger className="w-20 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

// 主组件
export default function TrajectoryReplay() {
  const { fleet, getDailyLog, getDailyTrajectory, dailyLogs } = useFleet();
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<'yield' | 'speed' | 'status'>('status');

  // Get available dates (last 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => 
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  // Get current trajectory data
  const currentTrajectory = selectedMachineId 
    ? (getDailyTrajectory(selectedMachineId, format(selectedDate, 'yyyy-MM-dd')) || null)
    : null;

  // Get daily log for selected machine
  const dailyLog = selectedMachineId 
    ? getDailyLog(selectedMachineId, format(selectedDate, 'yyyy-MM-dd'))
    : null;

  // Get current point
  const currentPoint = currentTrajectory?.points[currentIndex] || null;

  // Get selected machine
  const selectedMachine = fleet.find(m => m.id === selectedMachineId);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !currentTrajectory) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= currentTrajectory.points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, currentTrajectory]);

  // Reset index when trajectory changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [currentTrajectory]);

  // Auto-select first machine
  useEffect(() => {
    if (fleet.length > 0 && !selectedMachineId) {
      setSelectedMachineId(fleet[0].id);
    }
  }, [fleet, selectedMachineId]);

  return (
    <div className="h-full flex bg-gray-100">
      {/* 左侧边栏 - 设备和日期选择 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700">
          <h2 className="font-bold text-white flex items-center gap-2 text-lg">
            <Route className="w-5 h-5" />
            轨迹回放
          </h2>
          <p className="text-xs text-green-100 mt-1">查看设备历史作业轨迹</p>
        </div>
        
        <div className="p-4 border-b border-gray-100">
          <label className="text-xs font-medium text-gray-500 mb-3 block">选择日期</label>
          <DateSelector 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={availableDates}
          />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 pb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500">选择设备</label>
            <Badge variant="outline" className="text-xs">
              {fleet.length} 台设备
            </Badge>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            <MachineSelector 
              machines={fleet}
              selectedId={selectedMachineId}
              onSelect={setSelectedMachineId}
            />
          </ScrollArea>
        </div>
      </div>

      {/* 主内容区 - 地图和控制 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">颜色模式:</span>
            </div>
            <Tabs value={colorMode} onValueChange={(v) => setColorMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="status" className="text-xs px-3 h-7">作业状态</TabsTrigger>
                <TabsTrigger value="yield" className="text-xs px-3 h-7">产量分布</TabsTrigger>
                <TabsTrigger value="speed" className="text-xs px-3 h-7">速度变化</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Download className="w-4 h-4 mr-1" />
              导出数据
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <Share2 className="w-4 h-4 mr-1" />
              分享
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 地图区域 */}
        <div className="flex-1 p-4">
          <AMapTrajectoryView 
            trajectory={currentTrajectory}
            currentIndex={currentIndex}
            colorMode={colorMode}
            machine={selectedMachine}
          />
        </div>
        
        {/* 播放控制栏 */}
        <PlaybackControls
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          totalPoints={currentTrajectory?.points.length || 0}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          currentTime={currentPoint?.time || "--:--"}
          startTime={currentTrajectory?.points[0]?.time || "07:00"}
          endTime={currentTrajectory?.points[currentTrajectory.points.length - 1]?.time || "17:00"}
        />
      </div>

      {/* 右侧边栏 - 数据面板 */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm">
        <Tabs defaultValue="realtime" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b bg-gray-50 p-1">
            <TabsTrigger value="realtime" className="flex-1 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1" />
              实时数据
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 text-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              统计分析
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="realtime" className="flex-1 m-0 p-4 overflow-auto">
            <RealtimeDataPanel 
              currentPoint={currentPoint}
              machine={selectedMachine}
            />
            
            {/* 位置信息 */}
            {currentPoint && (
              <Card className="mt-4 border-green-200 bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    当前位置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">纬度</span>
                    <span className="font-mono text-gray-900">{currentPoint.lat.toFixed(6)}°N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">经度</span>
                    <span className="font-mono text-gray-900">{currentPoint.lng.toFixed(6)}°E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态</span>
                    <Badge variant={currentPoint.status === "working" ? "default" : "secondary"}>
                      {currentPoint.status === "working" ? "作业中" : currentPoint.status === "turning" ? "转弯" : "怠速"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="stats" className="flex-1 m-0 p-4 overflow-auto">
            <TrajectoryStats 
              trajectory={currentTrajectory}
              dailyLog={dailyLog}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
