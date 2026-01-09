import { useEffect, useRef, useState, useCallback } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Calendar as CalendarIcon, Layers, ZoomIn, ZoomOut, Locate, Maximize2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { FARM_CONFIG, getBrandInfo, getMachineImage, getStatusColor } from "@/lib/config";

// 瓦片配置 - 友谊农场
const TILE_CONFIG = {
  center: [131.85, 46.85] as [number, number],
  bounds: [[131.69, 46.72], [132.01, 46.98]] as [[number, number], [number, number]],
  minZoom: 10,  // 允许缩小到更大范围
  maxZoom: 17,
  tileSize: 256,
  // 离线瓦片实际范围
  offlineMinZoom: 14,
  offlineMaxZoom: 17,
};

// 瓦片URL模板
const getLocalTileUrl = (z: number, x: number, y: number) => `/tiles/${z}/${x}/${y}.png`;
// 在线瓦片备用源 (ArcGIS World Imagery)
const getOnlineTileUrl = (z: number, x: number, y: number) => 
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

// 检查瓦片是否在离线范围内
const isInOfflineRange = (z: number, x: number, y: number): boolean => {
  if (z < TILE_CONFIG.offlineMinZoom || z > TILE_CONFIG.offlineMaxZoom) return false;
  
  // 根据缩放级别计算瓦片范围
  const tileRanges: Record<number, { x: [number, number], y: [number, number] }> = {
    14: { x: [14183, 14190], y: [5773, 5780] },
    15: { x: [28366, 28380], y: [11546, 11560] },
    16: { x: [56733, 56760], y: [23092, 23120] },
    17: { x: [113466, 113521], y: [46185, 46240] },
  };
  
  const range = tileRanges[z];
  if (!range) return false;
  
  return x >= range.x[0] && x <= range.x[1] && y >= range.y[0] && y <= range.y[1];
};

// 经纬度转瓦片坐标
const lngLatToTile = (lng: number, lat: number, zoom: number): [number, number] => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return [x, y];
};

// 瓦片坐标转经纬度
const tileToLngLat = (x: number, y: number, zoom: number): [number, number] => {
  const n = Math.pow(2, zoom);
  const lng = x / n * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  return [lng, lat];
};

// 经纬度转像素坐标
const lngLatToPixel = (lng: number, lat: number, zoom: number, centerLng: number, centerLat: number, width: number, height: number): [number, number] => {
  const scale = Math.pow(2, zoom) * TILE_CONFIG.tileSize;
  
  const worldX = (lng + 180) / 360 * scale;
  const worldY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const centerWorldX = (centerLng + 180) / 360 * scale;
  const centerWorldY = (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const x = worldX - centerWorldX + width / 2;
  const y = worldY - centerWorldY + height / 2;
  
  return [x, y];
};

// 像素坐标转经纬度
const pixelToLngLat = (px: number, py: number, zoom: number, centerLng: number, centerLat: number, width: number, height: number): [number, number] => {
  const scale = Math.pow(2, zoom) * TILE_CONFIG.tileSize;
  
  const centerWorldX = (centerLng + 180) / 360 * scale;
  const centerWorldY = (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const worldX = px - width / 2 + centerWorldX;
  const worldY = py - height / 2 + centerWorldY;
  
  const lng = worldX / scale * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY / scale))) * 180 / Math.PI;
  
  return [lng, lat];
};

interface OfflineMapProps {
  className?: string;
}

export default function OfflineMap({ className }: OfflineMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(15);
  const [center, setCenter] = useState<[number, number]>(TILE_CONFIG.center);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const tilesCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  
  const { 
    fleet, 
    activeMachineId, 
    setActiveMachineId, 
    selectedDate, 
    setSelectedDate,
    getDailyTrajectory 
  } = useFleet();

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);
  const [showHistoryControl, setShowHistoryControl] = useState(false);
  const animationRef = useRef<number | null>(null);

  // 当选中设备变化时，自动移动地图到设备位置
  useEffect(() => {
    if (activeMachineId) {
      const machine = fleet.find(m => m.id === activeMachineId);
      if (machine) {
        // 平滑移动到设备位置
        setCenter([machine.lng, machine.lat]);
        // 如果缩放级别太小，自动放大
        if (zoom < 16) {
          setZoom(16);
        }
      }
    }
  }, [activeMachineId, fleet]);

  // 监听容器大小变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 加载瓦片图片 - 智能选择离线/在线源
  const loadTile = useCallback((z: number, x: number, y: number): Promise<HTMLImageElement | null> => {
    const key = `${z}/${x}/${y}`;
    
    if (tilesCache.current.has(key)) {
      return Promise.resolve(tilesCache.current.get(key)!);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // 检查是否在离线范围内
      const useOffline = isInOfflineRange(z, x, y);
      const primaryUrl = useOffline ? getLocalTileUrl(z, x, y) : getOnlineTileUrl(z, x, y);
      const fallbackUrl = useOffline ? getOnlineTileUrl(z, x, y) : null;
      
      img.onload = () => {
        tilesCache.current.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        // 如果离线加载失败，尝试在线源
        if (fallbackUrl) {
          const fallbackImg = new Image();
          fallbackImg.crossOrigin = 'anonymous';
          fallbackImg.onload = () => {
            tilesCache.current.set(key, fallbackImg);
            resolve(fallbackImg);
          };
          fallbackImg.onerror = () => resolve(null);
          fallbackImg.src = fallbackUrl;
        } else {
          resolve(null);
        }
      };
      img.src = primaryUrl;
    });
  }, []);

  // 渲染地图
  const renderMap = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // 计算需要显示的瓦片范围
    const [centerTileX, centerTileY] = lngLatToTile(center[0], center[1], zoom);
    const tilesX = Math.ceil(width / TILE_CONFIG.tileSize) + 2;
    const tilesY = Math.ceil(height / TILE_CONFIG.tileSize) + 2;

    const startTileX = centerTileX - Math.floor(tilesX / 2);
    const startTileY = centerTileY - Math.floor(tilesY / 2);

    // 计算偏移量
    const scale = Math.pow(2, zoom) * TILE_CONFIG.tileSize;
    const centerWorldX = (center[0] + 180) / 360 * scale;
    const centerWorldY = (1 - Math.log(Math.tan(center[1] * Math.PI / 180) + 1 / Math.cos(center[1] * Math.PI / 180)) / Math.PI) / 2 * scale;

    // 加载并绘制瓦片
    const tilePromises: Promise<void>[] = [];

    for (let dx = 0; dx < tilesX; dx++) {
      for (let dy = 0; dy < tilesY; dy++) {
        const tileX = startTileX + dx;
        const tileY = startTileY + dy;

        const tileWorldX = tileX * TILE_CONFIG.tileSize;
        const tileWorldY = tileY * TILE_CONFIG.tileSize;

        const screenX = tileWorldX - centerWorldX + width / 2;
        const screenY = tileWorldY - centerWorldY + height / 2;

        tilePromises.push(
          loadTile(zoom, tileX, tileY).then((img) => {
            if (img) {
              ctx.drawImage(img, screenX, screenY, TILE_CONFIG.tileSize, TILE_CONFIG.tileSize);
            }
          })
        );
      }
    }

    await Promise.all(tilePromises);

    // 绘制设备轨迹和标记
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

    fleet.forEach(machine => {
      // 绘制轨迹
      const trajectory = getDailyTrajectory(machine.id, selectedDate);
      if (trajectory && trajectory.path.length > 0) {
        const visiblePathIndex = isToday 
          ? trajectory.path.length 
          : Math.floor((progress / 100) * trajectory.path.length);
        const visiblePath = trajectory.path.slice(0, Math.max(2, visiblePathIndex));

        if (visiblePath.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = machine.type === 'harvester' ? '#367C2B' : '#0066CC';
          ctx.lineWidth = trajectory.swathWidth * Math.pow(2, zoom - 15);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.6;

          const [startX, startY] = lngLatToPixel(visiblePath[0][0], visiblePath[0][1], zoom, center[0], center[1], width, height);
          ctx.moveTo(startX, startY);

          for (let i = 1; i < visiblePath.length; i++) {
            const [x, y] = lngLatToPixel(visiblePath[i][0], visiblePath[i][1], zoom, center[0], center[1], width, height);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // 绘制设备标记
      let markerLng = machine.lng;
      let markerLat = machine.lat;

      if (!isToday && trajectory && trajectory.path.length > 0) {
        const pointIndex = Math.floor((progress / 100) * (trajectory.path.length - 1));
        markerLng = trajectory.path[pointIndex][0];
        markerLat = trajectory.path[pointIndex][1];
      }

      const [mx, my] = lngLatToPixel(markerLng, markerLat, zoom, center[0], center[1], width, height);

      // 绘制设备图标
      const isActive = machine.id === activeMachineId;
      const markerSize = isActive ? 32 : 24;

      // 绘制光晕效果
      if (machine.status === 'working') {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, markerSize * 1.5);
        gradient.addColorStop(0, 'rgba(54, 124, 43, 0.4)');
        gradient.addColorStop(1, 'rgba(54, 124, 43, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mx, my, markerSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 绘制设备圆形背景
      ctx.fillStyle = machine.type === 'harvester' 
        ? (machine.status === 'working' ? '#367C2B' : '#9CA3AF')
        : (machine.status === 'working' ? '#0066CC' : '#9CA3AF');
      ctx.beginPath();
      ctx.arc(mx, my, markerSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // 绘制边框
      ctx.strokeStyle = isActive ? '#FFDE00' : '#FFFFFF';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.stroke();

      // 绘制设备图标文字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${markerSize * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(machine.type === 'harvester' ? '🌾' : '🚜', mx, my);

      // 绘制设备名称标签
      if (zoom >= 16 || isActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const labelWidth = ctx.measureText(machine.name).width + 10;
        ctx.fillRect(mx - labelWidth / 2, my + markerSize / 2 + 5, labelWidth, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '11px Arial';
        ctx.fillText(machine.name, mx, my + markerSize / 2 + 14);
      }
    });

    // 绘制比例尺
    drawScaleBar(ctx, width, height, zoom);

  }, [dimensions, zoom, center, fleet, activeMachineId, selectedDate, progress, getDailyTrajectory, loadTile]);

  // 绘制比例尺
  const drawScaleBar = (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    const metersPerPixel = 156543.03392 * Math.cos(center[1] * Math.PI / 180) / Math.pow(2, zoom);
    let scaleLength = 100; // 像素
    let scaleMeters = scaleLength * metersPerPixel;

    // 调整到合适的单位
    let scaleText = '';
    if (scaleMeters >= 1000) {
      scaleMeters = Math.round(scaleMeters / 1000) * 1000;
      scaleLength = scaleMeters / metersPerPixel;
      scaleText = `${scaleMeters / 1000} km`;
    } else {
      scaleMeters = Math.round(scaleMeters / 100) * 100;
      scaleLength = scaleMeters / metersPerPixel;
      scaleText = `${scaleMeters} m`;
    }

    const x = 20;
    const y = height - 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - 5, y - 20, scaleLength + 10, 35);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaleLength, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + scaleLength, y - 5);
    ctx.lineTo(x + scaleLength, y + 5);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(scaleText, x + scaleLength / 2, y - 8);
  };

  // 渲染循环
  useEffect(() => {
    renderMap();
  }, [renderMap]);

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart([e.clientX, e.clientY]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const dx = e.clientX - dragStart[0];
    const dy = e.clientY - dragStart[1];

    const [newLng, newLat] = pixelToLngLat(
      dimensions.width / 2 - dx,
      dimensions.height / 2 - dy,
      zoom,
      center[0],
      center[1],
      dimensions.width,
      dimensions.height
    );

    setCenter([newLng, newLat]);
    setDragStart([e.clientX, e.clientY]);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(TILE_CONFIG.minZoom, Math.min(TILE_CONFIG.maxZoom, zoom + delta));
    setZoom(newZoom);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否点击了设备
    for (const machine of fleet) {
      const [mx, my] = lngLatToPixel(machine.lng, machine.lat, zoom, center[0], center[1], dimensions.width, dimensions.height);
      const distance = Math.sqrt(Math.pow(x - mx, 2) + Math.pow(y - my, 2));
      if (distance < 20) {
        setActiveMachineId(machine.id);
        return;
      }
    }
  };

  // 播放动画
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5;
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

  // 格式化时间
  const formatTime = (p: number) => {
    const totalMinutes = (18 - 7) * 60;
    const currentMinutes = (p / 100) * totalMinutes;
    const startMinutes = 7 * 60;
    const time = startMinutes + currentMinutes;
    const h = Math.floor(time / 60);
    const m = Math.floor(time % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className={cn("relative w-full h-full overflow-hidden bg-gray-900", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* 地图控制按钮 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="bg-white/90 hover:bg-white shadow-lg"
          onClick={() => setZoom(Math.min(TILE_CONFIG.maxZoom, zoom + 1))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="bg-white/90 hover:bg-white shadow-lg"
          onClick={() => setZoom(Math.max(TILE_CONFIG.minZoom, zoom - 1))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="bg-white/90 hover:bg-white shadow-lg"
          onClick={() => {
            setCenter(TILE_CONFIG.center);
            setZoom(15);
          }}
        >
          <Locate className="w-4 h-4" />
        </Button>
      </div>

      {/* 缩放级别显示 */}
      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-lg shadow-lg text-sm font-medium">
        缩放: {zoom} / {TILE_CONFIG.maxZoom}
      </div>

      {/* 历史回放控制 */}
      {showHistoryControl && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-36">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(selectedDate)}
                  onSelect={(date) => date && setSelectedDate(format(date, 'yyyy-MM-dd'))}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setProgress(0);
                setIsPlaying(false);
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => {
                  setProgress(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full"
              />
            </div>

            <div className="w-16 text-center font-mono">
              {formatTime(progress)}
            </div>
          </div>
        </div>
      )}

      {/* 切换历史模式按钮 */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute bottom-4 left-4 bg-white/90 hover:bg-white shadow-lg"
        onClick={() => {
          setShowHistoryControl(!showHistoryControl);
          if (!showHistoryControl) {
            setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
          }
        }}
      >
        <CalendarIcon className="w-4 h-4 mr-2" />
        {showHistoryControl ? '关闭历史' : '历史轨迹'}
      </Button>

      {/* 离线地图标识 */}
      <div className="absolute bottom-4 right-4 bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
        🛰️ 中国智慧农业 · 离线卫星图
      </div>
    </div>
  );
}
