import { useEffect, useRef, useState } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { FARM_CONFIG, getBrandInfo, getMachineImage, getStatusColor } from "@/lib/config";

declare global {
  interface Window {
    AMap: any;
  }
}

// 从统一配置文件导入（确保单一数据源）
const CENTER = FARM_CONFIG.mapCenter;
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || "6f025e700cbacbb0bb866712d20bb35c";
const AMAP_JS_URL = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { 
    fleet, 
    activeMachineId, 
    setActiveMachineId, 
    selectedDate, 
    setSelectedDate,
    getDailyTrajectory 
  } = useFleet();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100); // 0-100%
  const [showHistoryControl, setShowHistoryControl] = useState(false); // Toggle visibility
  const [filterStatus, setFilterStatus] = useState<"all" | "working" | "low_fuel">("all");
  const [mapError, setMapError] = useState<string | null>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  // Listen for global events from Header and Sidebar
  useEffect(() => {
    const handleToggleHistory = () => {
      setShowHistoryControl(true);
      // Auto-select yesterday for demo if today is selected
      if (selectedDate === format(new Date(), 'yyyy-MM-dd')) {
        setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
      }
    };

    const handleFilterFleet = (e: CustomEvent) => {
      if (e.detail && e.detail.status) {
        setFilterStatus(e.detail.status);
      }
    };

    const handleMapTypeChange = (e: CustomEvent) => {
      if (!mapInstance.current || !window.AMap) return;
      const map = mapInstance.current;
      const AMap = window.AMap;
      
      // 清除现有图层
      map.setLayers([]);
      
      if (e.detail.type === 'satellite') {
        // 卡星图 + 路网
        map.setLayers([
          new AMap.TileLayer.Satellite(),
          new AMap.TileLayer.RoadNet({ opacity: 0.5 })
        ]);
      } else {
        // 普通地图
        map.setLayers([
          new AMap.TileLayer()
        ]);
      }
    };

    window.addEventListener('toggle-history-mode', handleToggleHistory);
    window.addEventListener('filter-fleet', handleFilterFleet as EventListener);
    window.addEventListener('change-map-type', handleMapTypeChange as EventListener);
    
    return () => {
      window.removeEventListener('toggle-history-mode', handleToggleHistory);
      window.removeEventListener('filter-fleet', handleFilterFleet as EventListener);
      window.removeEventListener('change-map-type', handleMapTypeChange as EventListener);
    };
  }, [selectedDate, setSelectedDate]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    if (!AMAP_KEY) {
      setMapError("缺少 VITE_AMAP_KEY，请在 .env 中配置高德地图 Key");
      return;
    }

    // Load AMap script
    const script = document.createElement("script");
    script.src = AMAP_JS_URL;
    script.async = true;
    script.onerror = () => {
      setMapError("高德地图脚本加载失败，请检查网络或 Key 配置");
    };
    script.onload = () => {
      if (!(window as any).AMap) {
        setMapError("高德地图 SDK 未正确加载");
        return;
      }

      const AMap = (window as any).AMap;
      const map = new AMap.Map(mapContainer.current, {
        zoom: 14,
        center: CENTER,
        layers: [
            new window.AMap.TileLayer.Satellite(),
            new window.AMap.TileLayer.RoadNet({ opacity: 0.5 })
        ],
        viewMode: '3D',
        pitch: 0, // Top-down view for better field visualization
      });

      mapInstance.current = map;
      setMapError(null);
    };
    document.body.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []);

  // Focus on active machine ONLY when manually selected (not on every render)
  // We use a ref to track the last focused machine ID to prevent auto-panning on data updates
  const lastFocusedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapInstance.current || !activeMachineId) return;
    
    // Only pan if the active machine ID has actually changed (user clicked a new machine)
    if (lastFocusedIdRef.current === activeMachineId) return;
    lastFocusedIdRef.current = activeMachineId;

    const activeMachine = fleet.find(m => m.id === activeMachineId);
    if (activeMachine) {
      const trajectory = getDailyTrajectory(activeMachineId, selectedDate);
      if (trajectory && trajectory.points.length > 0) {
         const midPoint = trajectory.points[Math.floor(trajectory.points.length / 2)];
         mapInstance.current.panTo([midPoint.lng, midPoint.lat]);
      } else if (selectedDate === format(new Date(), 'yyyy-MM-dd')) {
         mapInstance.current.panTo([activeMachine.lng, activeMachine.lat]);
      }
      
      if (mapInstance.current.getZoom() < 15) {
        mapInstance.current.setZoom(15);
      }
    }
  }, [activeMachineId]); // Removed fleet and selectedDate from deps to prevent auto-pan on data refresh

  // Playback Animation Loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5; // Speed of playback
        });
      }, 50);
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isPlaying]);

  // Format time based on progress (07:00 - 18:00)
  const formatTime = (p: number) => {
    const totalMinutes = (18 - 7) * 60; // 11 hours
    const currentMinutes = (p / 100) * totalMinutes;
    const startMinutes = 7 * 60;
    const time = startMinutes + currentMinutes;
    const h = Math.floor(time / 60);
    const m = Math.floor(time % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Render Trajectories & Markers based on Selected Date
  useEffect(() => {
    if (!mapInstance.current || !(window as any).AMap) return;
    
    const AMap = (window as any).AMap;
    const map = mapInstance.current;

    // Clear existing elements
    markersRef.current.forEach(m => map.remove(m));
    polylinesRef.current.forEach(p => map.remove(p));
    markersRef.current = [];
    polylinesRef.current = [];

    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

    fleet.forEach(m => {
      // Apply filters
      if (filterStatus === "working" && m.status !== "working") return;
      if (filterStatus === "low_fuel" && m.fuel >= 20) return; 

      let path: number[][] = [];
      let currentPos: [number, number] = [m.lng, m.lat];
      // 根据设备类型和状态设置颜色
      let color = m.type === 'harvester' 
        ? (m.status === 'working' ? '#367C2B' : m.status === 'moving' ? '#FFDE00' : '#9CA3AF')
        : (m.status === 'working' ? '#0066CC' : m.status === 'moving' ? '#00AAFF' : '#9CA3AF');
      let swathWidth = m.type === 'harvester' ? 20 : 8;

      if (isToday) {
        // 今日也显示作业轨迹（使用当天的轨迹数据）
        const trajectory = getDailyTrajectory(m.id, selectedDate);
        if (trajectory && trajectory.path.length > 0) {
          // 今日轨迹显示到当前时间点（模拟实时进度）
          const currentHour = new Date().getHours();
          const workStartHour = 6;
          const workEndHour = 18;
          const todayProgress = Math.min(100, Math.max(0, ((currentHour - workStartHour) / (workEndHour - workStartHour)) * 100));
          const visibleIndex = Math.floor((todayProgress / 100) * trajectory.path.length);
          path = trajectory.path.slice(0, Math.max(2, visibleIndex));
          swathWidth = trajectory.swathWidth * 1.5;
        }
      } else {
        // Load History Trajectory
        const trajectory = getDailyTrajectory(m.id, selectedDate);
        if (trajectory) {
          path = trajectory.path;
          swathWidth = trajectory.swathWidth * 1.5; // Scale for visual visibility
          
          // Determine position based on playback progress
          const pointIndex = Math.floor((progress / 100) * (trajectory.points.length - 1));
          const point = trajectory.points[pointIndex];
          if (point) {
            currentPos = [point.lng, point.lat];
          }
        }
      }

      // 1. Draw Trajectory (Swath)
      if (path.length > 0) {
        // Filter path based on progress to simulate "drawing"
        const visiblePathIndex = Math.floor((progress / 100) * path.length);
        // Ensure we have at least 2 points to draw a line, and handle even/odd for pairs
        const visiblePath = path.slice(0, Math.max(2, visiblePathIndex + (visiblePathIndex % 2))); 

        const swath = new AMap.Polyline({
          path: visiblePath,
          strokeColor: color,
          strokeWeight: swathWidth,
          strokeOpacity: 0.4,
          zIndex: 20,
          lineJoin: 'round',
          lineCap: 'square',
          cursor: 'pointer', // Make it look clickable
          extData: { // Store data for click event
            yield: (Math.random() * (600 - 450) + 450).toFixed(0), // Mock yield data
            moisture: (Math.random() * (15 - 12) + 12).toFixed(1), // Mock moisture data
            machineName: m.name
          }
        });
        
        // Add click event to show InfoWindow
        swath.on('click', (e: any) => {
          const data = e.target.getExtData();
          const infoWindow = new AMap.InfoWindow({
            content: `
              <div class="p-2 min-w-[150px]">
                <h4 class="font-bold text-gray-800 mb-2 border-b pb-1">${data.machineName} - 作业详情</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div class="text-gray-500">实时产量:</div>
                  <div class="font-bold text-amber-600">${data.yield} kg/亩</div>
                  <div class="text-gray-500">谷物水分:</div>
                  <div class="font-bold text-blue-600">${data.moisture}%</div>
                </div>
              </div>
            `,
            offset: new AMap.Pixel(0, -10)
          });
          infoWindow.open(map, e.lnglat);
        });

        map.add(swath);
        polylinesRef.current.push(swath);

        const centerLine = new AMap.Polyline({
          path: visiblePath,
          strokeColor: "white",
          strokeWeight: 1,
          strokeOpacity: 0.6,
          zIndex: 21,
          lineDash: [4, 4]
        });
        map.add(centerLine);
        polylinesRef.current.push(centerLine);
      }

      // 2. Draw Marker - 使用真实农机照片图标
      const isActive = activeMachineId === m.id;
      const markerContent = document.createElement("div");
      markerContent.className = "relative group cursor-pointer";
      
      // 从统一配置获取品牌信息（确保单一数据源）
      const brandInfo = getBrandInfo(m.brand);
      const brand = {
        primary: brandInfo.primary,
        secondary: brandInfo.secondary,
        initial: brandInfo.initial
      };
      
      // 从统一配置获取状态颜色
      const statusColor = getStatusColor(m.status);
      
      // 从统一配置获取设备图片
      const machineImg = getMachineImage(m.brand, m.type as 'harvester' | 'tractor');
      
      markerContent.innerHTML = `
        <div class="absolute -top-16 -left-8 bg-white rounded-xl shadow-lg p-1 border-2 ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'} flex flex-col items-center w-16 z-50 transition-transform hover:scale-110" style="border-color: ${isActive ? '#3B82F6' : brand.primary + '80'}">
           <div class="w-14 h-10 rounded-lg overflow-hidden bg-gray-100">
              <img src="${machineImg}" alt="${m.name}" class="w-full h-full object-cover" onerror="this.style.display='none'" />
           </div>
           <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b" style="border-color: ${isActive ? '#3B82F6' : brand.primary + '80'}"></div>
           <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm" style="background-color: ${statusColor}"></div>
           <div class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded text-[8px] font-bold text-white" style="background-color: ${brand.primary}">
              ${brand.initial}
           </div>
        </div>
        <div class="absolute -top-[76px] -left-24 w-56 text-center pointer-events-none">
           <span class="bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold shadow-md border text-gray-800" style="border-color: ${brand.primary}40">${m.name}</span>
        </div>
      `;

      markerContent.addEventListener('click', () => {
        setActiveMachineId(m.id);
        window.dispatchEvent(new CustomEvent('open-right-panel'));
      });

      const marker = new AMap.Marker({
        position: currentPos,
        content: markerContent,
        offset: new AMap.Pixel(0, 0),
        zIndex: isActive ? 200 : 100,
      });
      
      map.add(marker);
      markersRef.current.push(marker);
    });

  }, [fleet, activeMachineId, setActiveMachineId, selectedDate, progress, getDailyTrajectory]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-sm px-4 text-center">
          <div className="space-y-2">
            <div className="font-semibold">地图加载失败</div>
            <div className="text-xs opacity-80">{mapError}</div>
            <div className="text-xs opacity-70">请检查 VITE_AMAP_KEY、网络或更换可用的高德 Key 后重启</div>
          </div>
        </div>
      )}
      
      {/* Date & Playback Controls */}
      <div className={cn(
        "absolute bottom-8 right-8 z-50 flex flex-col gap-3 pointer-events-auto transition-all duration-500 ease-in-out transform",
        showHistoryControl || selectedDate !== format(new Date(), 'yyyy-MM-dd') ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}>
        
        {/* Date Picker */}
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl border border-gray-200 shadow-xl self-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(new Date(selectedDate), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={new Date(selectedDate)}
                onSelect={(date) => date && setSelectedDate(format(date, 'yyyy-MM-dd'))}
                disabled={(date) => date > new Date() || date < subDays(new Date(), 10)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Playback Control */}
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-xl w-96">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs font-bold text-gray-800">
                {selectedDate === format(new Date(), 'yyyy-MM-dd') ? '今日实时' : '历史回放'}
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {formatTime(progress)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              variant="outline" 
              className="h-8 w-8 rounded-full border-gray-300 hover:bg-gray-50 hover:text-green-600 transition-colors active:scale-90"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) {
                  toast.success("开始回放作业轨迹");
                } else {
                  toast.info("已暂停回放");
                }
              }}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
            </Button>
            
            <div className="flex-1 relative h-6 flex items-center group">
              <div className="absolute w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-100 ease-linear" 
                    style={{ width: `${progress}%` }} 
                 />
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="0.1"
                value={progress}
                onChange={(e) => {
                  setProgress(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute h-4 w-4 bg-white border-2 border-green-500 rounded-full shadow-md pointer-events-none transition-all duration-100 ease-linear"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full active:scale-90 transition-transform"
              onClick={() => {
                setProgress(0);
                toast.info("轨迹已重置");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
