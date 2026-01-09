import { useRef, useState, useEffect, useCallback } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Calendar as CalendarIcon, Layers, ZoomIn, ZoomOut, Locate, Maximize2, Map as MapIcon, Satellite } from "lucide-react";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { FARM_CONFIG, getBrandInfo, getMachineImage, getStatusColor } from "@/lib/config";

// 地图配置 - 黑龙江友谊农场
const MAP_CONFIG = {
  center: { lat: 46.85, lng: 131.85 },
  bounds: {
    north: 46.98,
    south: 46.72,
    east: 132.01,
    west: 131.69
  },
  minZoom: 8,
  maxZoom: 18,
  defaultZoom: 12,
};

// Google Maps 卫星瓦片URL
const getTileUrl = (x: number, y: number, z: number) => 
  `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;

// 坐标转换函数
const lngLatToTile = (lng: number, lat: number, zoom: number): [number, number] => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return [x, y];
};

const lngLatToPixel = (
  lng: number, 
  lat: number, 
  zoom: number, 
  centerLng: number, 
  centerLat: number,
  width: number,
  height: number
): [number, number] => {
  const scale = Math.pow(2, zoom) * 256;
  
  const worldX = (lng + 180) / 360 * scale;
  const worldY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const centerWorldX = (centerLng + 180) / 360 * scale;
  const centerWorldY = (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const pixelX = worldX - centerWorldX + width / 2;
  const pixelY = worldY - centerWorldY + height / 2;
  
  return [pixelX, pixelY];
};

const pixelToLngLat = (
  pixelX: number,
  pixelY: number,
  zoom: number,
  centerLng: number,
  centerLat: number,
  width: number,
  height: number
): [number, number] => {
  const scale = Math.pow(2, zoom) * 256;
  
  const centerWorldX = (centerLng + 180) / 360 * scale;
  const centerWorldY = (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * scale;
  
  const worldX = pixelX - width / 2 + centerWorldX;
  const worldY = pixelY - height / 2 + centerWorldY;
  
  const lng = worldX / scale * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY / scale))) * 180 / Math.PI;
  
  return [lng, lat];
};

// 产量颜色渐变 - 参考迪尔智联
const getYieldColor = (yieldValue: number, maxYield: number = 800): string => {
  const ratio = Math.min(1, yieldValue / maxYield);
  if (ratio >= 0.8) return '#22c55e'; // 绿色 - 高产
  if (ratio >= 0.6) return '#84cc16'; // 黄绿色
  if (ratio >= 0.4) return '#eab308'; // 黄色
  if (ratio >= 0.2) return '#f97316'; // 橙色
  return '#ef4444'; // 红色 - 低产
};

interface GoogleMapProps {
  className?: string;
}

export default function GoogleMap({ className }: GoogleMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRenderingRef = useRef(false);
  const lastRenderRef = useRef<ImageData | null>(null);
  const [zoom, setZoom] = useState(MAP_CONFIG.defaultZoom);
  const [center, setCenter] = useState<[number, number]>([MAP_CONFIG.center.lng, MAP_CONFIG.center.lat]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const tilesCache = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // 触摸手势状态
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [pinchCenter, setPinchCenter] = useState<{x: number, y: number} | null>(null);
  
  const { 
    fleet, 
    activeMachineId, 
    setActiveMachineId,
    getDailyTrajectory,
    allLogs
  } = useFleet();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);
  const animationRef = useRef<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'map'>('satellite');
  const [showYieldOverlay, setShowYieldOverlay] = useState(true);

  // 监听activeMachineId变化，自动移动到设备位置
  useEffect(() => {
    if (activeMachineId) {
      const machine = fleet.find(m => m.id === activeMachineId);
      if (machine) {
        // 平滑移动到设备位置
        setCenter([machine.lng, machine.lat]);
        // 放大到足够的级别查看设备
        setZoom(16);
      }
    }
  }, [activeMachineId, fleet]);

  // 容器尺寸监听
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 瓦片加载
  const loadTile = useCallback((z: number, x: number, y: number): Promise<HTMLImageElement | null> => {
    const key = `${z}/${x}/${y}`;
    
    if (tilesCache.current.has(key)) {
      return Promise.resolve(tilesCache.current.get(key)!);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        tilesCache.current.set(key, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = getTileUrl(x, y, z);
    });
  }, []);

  // 渲染地图 - 使用双缓冲避免黑屏闪烁
  const renderMap = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 防止重复渲染
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRenderingRef.current = false;
      return;
    }

    const { width, height } = dimensions;
    
    // 创建离屏画布
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      isRenderingRef.current = false;
      return;
    }
    
    // 设置主画布尺寸
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    
    // 在离屏画布上绘制浅灰色背景（而不是黑色）
    offCtx.fillStyle = '#e5e7eb';
    offCtx.fillRect(0, 0, width, height);

    // 计算可见瓦片
    const [centerTileX, centerTileY] = lngLatToTile(center[0], center[1], zoom);
    const tilesX = Math.ceil(width / 256) + 2;
    const tilesY = Math.ceil(height / 256) + 2;

    const startTileX = centerTileX - Math.floor(tilesX / 2);
    const startTileY = centerTileY - Math.floor(tilesY / 2);

    const scale = Math.pow(2, zoom) * 256;
    const centerWorldX = (center[0] + 180) / 360 * scale;
    const centerWorldY = (1 - Math.log(Math.tan(center[1] * Math.PI / 180) + 1 / Math.cos(center[1] * Math.PI / 180)) / Math.PI) / 2 * scale;

    // 加载并绘制瓦片
    const tilePromises: Promise<void>[] = [];

    for (let dx = 0; dx < tilesX; dx++) {
      for (let dy = 0; dy < tilesY; dy++) {
        const tileX = startTileX + dx;
        const tileY = startTileY + dy;

        const tileWorldX = tileX * 256;
        const tileWorldY = tileY * 256;

        const screenX = tileWorldX - centerWorldX + width / 2;
        const screenY = tileWorldY - centerWorldY + height / 2;

        tilePromises.push(
          loadTile(zoom, tileX, tileY).then((img) => {
            if (img) {
              offCtx.drawImage(img, screenX, screenY, 256, 256);
            }
          })
        );
      }
    }

    await Promise.all(tilePromises);

    // 绘制作业轨迹和产量覆盖
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
    const drawCtx = offCtx; // 使用离屏画布绘制所有内容

    fleet.forEach(machine => {
      const trajectory = getDailyTrajectory(machine.id, selectedDate);
      if (trajectory && trajectory.path.length > 0) {
        const pathToDraw = isToday 
          ? trajectory.path 
          : trajectory.path.slice(0, Math.floor(trajectory.path.length * (progress / 100)));
        
        if (pathToDraw.length > 1) {
          // 绘制产量覆盖条纹（参考迪尔智联）
          if (showYieldOverlay && machine.type === 'harvester') {
            offCtx.globalAlpha = 0.6;
            const stripWidth = zoom >= 15 ? 12 : zoom >= 13 ? 8 : 4;
            
            for (let i = 1; i < pathToDraw.length; i++) {
              const [x1, y1] = lngLatToPixel(
                pathToDraw[i - 1][0], pathToDraw[i - 1][1], zoom, center[0], center[1], width, height
              );
              const [x2, y2] = lngLatToPixel(
                pathToDraw[i][0], pathToDraw[i][1], zoom, center[0], center[1], width, height
              );
              
              // 模拟产量数据
              const yieldValue = 600 + Math.sin(i * 0.1) * 150 + Math.random() * 100;
              offCtx.strokeStyle = getYieldColor(yieldValue);
              offCtx.lineWidth = stripWidth;
              offCtx.lineCap = 'butt';
              offCtx.beginPath();
              offCtx.moveTo(x1, y1);
              offCtx.lineTo(x2, y2);
              offCtx.stroke();
            }
            offCtx.globalAlpha = 1;
          }
          
          // 绘制轨迹线
          offCtx.beginPath();
          offCtx.strokeStyle = getBrandInfo(machine.brand).primary;
          offCtx.lineWidth = 3;
          offCtx.lineCap = 'round';
          offCtx.lineJoin = 'round';
          offCtx.setLineDash([]);
          
          const [startX, startY] = lngLatToPixel(
            pathToDraw[0][0], pathToDraw[0][1], zoom, center[0], center[1], width, height
          );
          offCtx.moveTo(startX, startY);
          
          for (let i = 1; i < pathToDraw.length; i++) {
            const [px, py] = lngLatToPixel(
              pathToDraw[i][0], pathToDraw[i][1], zoom, center[0], center[1], width, height
            );
            offCtx.lineTo(px, py);
          }
          offCtx.stroke();
        }
      }

      // 绘制设备标记
      const [mx, my] = lngLatToPixel(machine.lng, machine.lat, zoom, center[0], center[1], width, height);
      
      if (mx < -50 || mx > width + 50 || my < -50 || my > height + 50) return;

      const isActive = machine.id === activeMachineId;
      const statusColor = getStatusColor(machine.status);
      const brandColor = getBrandInfo(machine.brand).primary;
      
      // 光晕效果
      if (machine.status === 'working' || machine.status === 'moving') {
        const gradient = offCtx.createRadialGradient(mx, my, 0, mx, my, 35);
        gradient.addColorStop(0, `${statusColor}70`);
        gradient.addColorStop(0.5, `${statusColor}30`);
        gradient.addColorStop(1, `${statusColor}00`);
        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.arc(mx, my, 35, 0, Math.PI * 2);
        offCtx.fill();
      }
      
      // 设备图标背景
      offCtx.beginPath();
      offCtx.arc(mx, my, isActive ? 20 : 16, 0, Math.PI * 2);
      offCtx.fillStyle = brandColor;
      offCtx.fill();
      offCtx.strokeStyle = isActive ? '#FFD700' : '#FFFFFF';
      offCtx.lineWidth = isActive ? 4 : 2;
      offCtx.stroke();
      
      // 设备类型图标
      offCtx.fillStyle = '#FFFFFF';
      offCtx.font = `bold ${isActive ? 14 : 11}px Arial`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      const icon = machine.type === 'harvester' ? '🌾' : '🚜';
      offCtx.fillText(icon, mx, my);
      
      // 设备名称标签
      if (zoom >= 13 || isActive) {
        offCtx.font = '12px Arial';
        offCtx.fillStyle = '#FFFFFF';
        offCtx.strokeStyle = '#000000';
        offCtx.lineWidth = 3;
        const label = machine.name.split(' ').slice(0, 2).join(' ');
        offCtx.strokeText(label, mx, my + 30);
        offCtx.fillText(label, mx, my + 30);
      }
    });

    // 绘制比例尺
    drawScaleBar(offCtx, width, height, zoom);

    // 绘制产量图例
    if (showYieldOverlay && zoom >= 12) {
      drawYieldLegend(offCtx, width, height);
    }
    
    // 双缓冲：一次性将离屏画布复制到主画布，避免闪烁
    ctx.drawImage(offscreen, 0, 0);
    
    // 保存当前帧用于下次渲染时保持显示
    try {
      lastRenderRef.current = ctx.getImageData(0, 0, width, height);
    } catch (e) {
      // 跨域图片可能无法获取ImageData
    }
    
    isRenderingRef.current = false;

  }, [dimensions, center, zoom, fleet, activeMachineId, selectedDate, progress, loadTile, getDailyTrajectory, showYieldOverlay]);

  // 绘制比例尺
  const drawScaleBar = (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    const metersPerPixel = 156543.03392 * Math.cos(center[1] * Math.PI / 180) / Math.pow(2, zoom);
    let scaleMeters = 100;
    let scaleLength = scaleMeters / metersPerPixel;

    let scaleText = '';
    if (scaleMeters >= 1609.34) {
      const miles = scaleMeters / 1609.34;
      scaleMeters = Math.round(miles) * 1609.34;
      scaleLength = scaleMeters / metersPerPixel;
      scaleText = `${Math.round(miles)} 英里`;
    } else if (scaleMeters >= 1000) {
      scaleMeters = Math.round(scaleMeters / 1000) * 1000;
      scaleLength = scaleMeters / metersPerPixel;
      scaleText = `${scaleMeters / 1000} 公里`;
    } else {
      scaleMeters = Math.round(scaleMeters / 100) * 100;
      scaleLength = scaleMeters / metersPerPixel;
      scaleText = `${Math.round(scaleMeters)} 米`;
    }

    const x = 20;
    const y = height - 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - 5, y - 20, scaleLength + 60, 35);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 5, y - 20, scaleLength + 60, 35);

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, scaleLength, 6);

    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(scaleText, x + scaleLength + 8, y + 5);
  };

  // 绘制产量图例
  const drawYieldLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendX = width - 140;
    const legendY = 80;
    const legendWidth = 120;
    const legendHeight = 160;

    // 背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, legendWidth, legendHeight, 8);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('产量图例', legendX + 10, legendY + 20);

    // 颜色条
    const colors = [
      { color: '#22c55e', label: '> 640 kg/亩', percent: '优' },
      { color: '#84cc16', label: '480-640', percent: '良' },
      { color: '#eab308', label: '320-480', percent: '中' },
      { color: '#f97316', label: '160-320', percent: '差' },
      { color: '#ef4444', label: '< 160', percent: '低' },
    ];

    colors.forEach((item, index) => {
      const y = legendY + 40 + index * 22;
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 10, y, 16, 16);
      ctx.font = '11px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(item.label, legendX + 32, y + 12);
    });
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
    // 更流畅的缩放 - 使用0.5步长
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    const newZoom = Math.max(MAP_CONFIG.minZoom, Math.min(MAP_CONFIG.maxZoom, zoom + delta));
    setZoom(newZoom);
  };

  // 触摸事件处理 - iPad支持
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 单指拖动
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      // 双指缩放
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
      setPinchCenter({
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && touchStart && isDragging) {
      // 单指拖动
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;

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
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // 双指缩放
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scale = newDistance / lastTouchDistance;
      const zoomDelta = Math.log2(scale);
      const newZoom = Math.max(MAP_CONFIG.minZoom, Math.min(MAP_CONFIG.maxZoom, zoom + zoomDelta));
      
      setZoom(newZoom);
      setLastTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setLastTouchDistance(null);
    setPinchCenter(null);
    setIsDragging(false);
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
      if (distance < 25) {
        setActiveMachineId(machine.id);
        return;
      }
    }
  };

  // 动画播放
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
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying]);

  // 格式化时间
  const formatTime = (progressPercent: number) => {
    const currentMinutes = Math.floor((progressPercent / 100) * 720);
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
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />



      {/* 地图控制按钮 - 简洁风格 */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 backdrop-blur-2xl bg-white/90 rounded-2xl p-1 shadow-lg border border-white/60">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100 rounded-xl h-9 w-9 transition-colors"
          onClick={() => setZoom(Math.min(MAP_CONFIG.maxZoom, zoom + 0.5))}
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100 rounded-xl h-9 w-9 transition-colors"
          onClick={() => setZoom(Math.max(MAP_CONFIG.minZoom, zoom - 0.5))}
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </Button>
        <div className="h-px bg-gray-200 mx-1.5" />
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100 rounded-xl h-9 w-9 transition-colors"
          onClick={() => {
            setCenter([MAP_CONFIG.center.lng, MAP_CONFIG.center.lat]);
            setZoom(MAP_CONFIG.defaultZoom);
          }}
        >
          <Locate className="w-4 h-4 text-gray-600" />
        </Button>
      </div>

      {/* 地图类型切换 - 左下角 */}
      <div className="absolute bottom-4 left-4 backdrop-blur-2xl bg-white/90 rounded-xl p-1 shadow-lg border border-white/60 flex gap-0.5">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "rounded-lg px-3 h-8 text-sm font-medium transition-colors",
            mapType === 'map' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'hover:bg-gray-100 text-gray-600'
          )}
          onClick={() => setMapType('map')}
        >
          地图
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "rounded-lg px-3 h-8 text-sm font-medium transition-colors",
            mapType === 'satellite' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'hover:bg-gray-100 text-gray-600'
          )}
          onClick={() => setMapType('satellite')}
        >
          卫星
        </Button>
      </div>

      {/* 产量覆盖开关 - 左下角地图切换上方 */}
      <div className="absolute bottom-16 left-4 backdrop-blur-2xl bg-white/90 rounded-xl p-1 shadow-lg border border-white/60">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "rounded-lg px-3 h-8 text-sm font-medium transition-colors",
            showYieldOverlay ? 'bg-green-500 text-white hover:bg-green-600' : 'hover:bg-gray-100 text-gray-600'
          )}
          onClick={() => setShowYieldOverlay(!showYieldOverlay)}
        >
          <Layers className="w-4 h-4 mr-1.5" />
          产量
        </Button>
      </div>
    </div>
  );
}
