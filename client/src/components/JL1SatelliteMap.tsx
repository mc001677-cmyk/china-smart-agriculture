import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, ZoomIn, ZoomOut, Locate, Maximize2 } from 'lucide-react';

// 吉林一号卫星影像配置（从环境变量读取，避免把密钥写死在代码里）
const JL1_MK = import.meta.env.VITE_JL1_MAP_MK || "";
const JL1_TK = import.meta.env.VITE_JL1_MAP_TK || "";
const JL1_BASE_URL = import.meta.env.VITE_JL1_MAP_BASE_URL ?? "https://api.jl1mall.com/getMap";

const JL1_CONFIG = {
  mk: JL1_MK,
  tk: JL1_TK,
  getTileUrl: (z: number, x: number, y: number) => {
    // TMS 格式需要翻转 Y 轴（等价于瓦片模板中的 {-y}）
    const tmsY = Math.pow(2, z) - 1 - y;
    return `${JL1_BASE_URL}/${z}/${x}/${tmsY}?mk=${JL1_MK}&tk=${JL1_TK}`;
  },
};


// 声明全局类型
declare global {
  interface Window {
    JL1Map: any;
    ol: any;
  }
}

interface JL1SatelliteMapProps {
  center?: [number, number]; // [经度, 纬度]
  zoom?: number;
  className?: string;
  onMapReady?: (map: any) => void;
  markers?: Array<{
    id: string;
    position: [number, number];
    label?: string;
    type?: 'equipment' | 'field' | 'warning';
  }>;
  // 模拟运行叠加层：作业轨迹（折线）
  trajectories?: Array<{
    id: string;
    path: [number, number][]; // [lng, lat][]
    color?: string;
    width?: number;
    opacity?: number;
    isActive?: boolean;
  }>;
  // 模拟运行叠加层：已完成地块（面）
  completedFields?: Array<{
    id: string;
    boundary: [number, number][]; // [lng, lat][]
    label?: string;
    fillColor?: string;
    strokeColor?: string;
    opacity?: number;
  }>;
}

const JL1SatelliteMap: React.FC<JL1SatelliteMapProps> = ({
  center = [131.85, 46.85], // 默认友谊农场
  zoom = 12,
  className = '',
  onMapReady,
  markers = [],
  trajectories = [],
  completedFields = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerSourceRef = useRef<any>(null);
  const trajectorySourceRef = useRef<any>(null);
  const fieldSourceRef = useRef<any>(null);
  const isInteractingRef = useRef(false);
  const interactionTimerRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [mapType, setMapType] = useState<'satellite' | 'vector'>('satellite');

  // 加载 OpenLayers 和 JL1Map SDK
  useEffect(() => {
    const loadScripts = async () => {
      // 加载 OpenLayers CSS
      if (!document.querySelector('link[href*="ol.css"]')) {
        const olCss = document.createElement('link');
        olCss.rel = 'stylesheet';
        olCss.href = 'https://cdn.jsdelivr.net/npm/ol@7.5.2/ol.css';
        document.head.appendChild(olCss);
      }

      // 加载 OpenLayers JS
      if (!window.ol) {
        await new Promise<void>((resolve, reject) => {
          const olScript = document.createElement('script');
          olScript.src = 'https://cdn.jsdelivr.net/npm/ol@7.5.2/dist/ol.js';
          olScript.async = true;
          olScript.onload = () => resolve();
          olScript.onerror = () => reject(new Error('无法加载 OpenLayers'));
          document.head.appendChild(olScript);
        });
      }

      // 等待 ol 对象可用
      await new Promise<void>((resolve) => {
        const checkOl = () => {
          if (window.ol) {
            resolve();
          } else {
            setTimeout(checkOl, 100);
          }
        };
        checkOl();
      });
    };

    const initMap = async () => {
      try {
        await loadScripts();
        
        if (!mapContainerRef.current || !window.ol) return;

        const ol = window.ol;

        // 创建吉林一号卫星影像图层
        const jl1Layer = new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: `https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=${JL1_CONFIG.mk}&tk=${JL1_CONFIG.tk}`,
            projection: 'EPSG:3857',
            crossOrigin: 'anonymous',
            tileLoadFunction: (imageTile: any, src: string) => {
              // 自定义切片加载函数，处理 {-y} 占位符
              const z = imageTile.getTileCoord()[0];
              const x = imageTile.getTileCoord()[1];
              const y = imageTile.getTileCoord()[2];
              // TMS Y 轴翻转
              const tmsY = Math.pow(2, z) - 1 - y;
              const url = `https://api.jl1mall.com/getMap/${z}/${x}/${tmsY}?mk=${JL1_CONFIG.mk}&tk=${JL1_CONFIG.tk}`;
              imageTile.getImage().src = url;
            }
          }),
          visible: true,
        });

        // 创建 OpenStreetMap 底图作为备用
        const osmLayer = new ol.layer.Tile({
          source: new ol.source.OSM(),
          visible: false,
        });

        // ========= Vector Layers（一次初始化，后续动态更新 source）=========
        // 1) 已完成地块（面）
        const fieldSource = new ol.source.Vector({ features: [] });
        fieldSourceRef.current = fieldSource;
        const fieldLayer = new ol.layer.Vector({
          source: fieldSource,
          style: (feature: any) => {
            const fillColor = feature.get('fillColor') || 'rgba(34,197,94,0.18)';
            const strokeColor = feature.get('strokeColor') || 'rgba(34,197,94,0.75)';
            const name = feature.get('name');
            return new ol.style.Style({
              fill: new ol.style.Fill({ color: fillColor }),
              stroke: new ol.style.Stroke({ color: strokeColor, width: 2 }),
              text: name
                ? new ol.style.Text({
                    text: String(name),
                    fill: new ol.style.Fill({ color: '#0f172a' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
                    font: '12px sans-serif',
                  })
                : undefined,
            });
          },
          zIndex: 10,
        });

        // 2) 作业轨迹（线）
        const trajectorySource = new ol.source.Vector({ features: [] });
        trajectorySourceRef.current = trajectorySource;
        const trajectoryLayer = new ol.layer.Vector({
          source: trajectorySource,
          style: (feature: any) => {
            const color = feature.get('color') || 'rgba(59,130,246,0.7)';
            const width = feature.get('width') || 3;
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color,
                width,
                lineCap: 'round',
                lineJoin: 'round',
              }),
            });
          },
          zIndex: 20,
        });

        // 3) 设备点位（点）
        const markerSource = new ol.source.Vector({ features: [] });
        markerSourceRef.current = markerSource;
        const markerLayer = new ol.layer.Vector({
          source: markerSource,
          style: (feature: any) => {
            const type = feature.get('type');
            let color = '#6b7280';
            if (type === 'equipment') color = '#22c55e';
            else if (type === 'warning') color = '#ef4444';
            else if (type === 'field') color = '#3b82f6';

            return new ol.style.Style({
              image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
              }),
              text: feature.get('name')
                ? new ol.style.Text({
                    text: String(feature.get('name')),
                    offsetY: -15,
                    fill: new ol.style.Fill({ color: '#fff' }),
                    stroke: new ol.style.Stroke({ color: '#000', width: 3 }),
                    font: '12px sans-serif',
                  })
                : undefined,
            });
          },
          zIndex: 100,
        });

        // 创建地图实例
        const map = new ol.Map({
          target: mapContainerRef.current,
          layers: [osmLayer, jl1Layer, fieldLayer, trajectoryLayer, markerLayer],
          view: new ol.View({
            center: ol.proj.fromLonLat(center),
            zoom: zoom,
            minZoom: 3,
            maxZoom: 18,
          }),
          controls: ol.control.defaults.defaults({
            zoom: false,
            rotate: true,
            attribution: false,
          }),
        });

        mapRef.current = { map, jl1Layer, osmLayer, ol };
        setIsLoading(false);
        
        // 用户交互保护：拖拽/缩放时暂停自动跟随，避免冲突抖动/报错
        const markInteracting = () => {
          isInteractingRef.current = true;
          if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
          interactionTimerRef.current = window.setTimeout(() => {
            isInteractingRef.current = false;
            interactionTimerRef.current = null;
          }, 1200);
        };
        map.on('movestart', markInteracting);
        map.on('moveend', markInteracting);
        map.on('pointerdrag', markInteracting);

        // 监听缩放变化
        map.getView().on('change:resolution', () => {
          const newZoom = Math.round(map.getView().getZoom() || zoom);
          setCurrentZoom(newZoom);
        });

        // 初始化叠加层
        updateMarkers(markers, ol);
        updateCompletedFields(completedFields, ol);
        updateTrajectories(trajectories, ol);

        onMapReady?.(map);
      } catch (err: any) {
        console.error('地图初始化失败:', err);
        setError(err.message || '地图加载失败');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      // 清理地图实例
      try {
        if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = null;
        isInteractingRef.current = false;
      } catch {}
      if (mapRef.current && mapRef.current.map) {
        try {
          mapRef.current.map.setTarget(undefined);
        } catch {}
      }
      mapRef.current = null;
      markerSourceRef.current = null;
      trajectorySourceRef.current = null;
      fieldSourceRef.current = null;
    };
  }, []);

  // 动态更新标记点（模拟运行：设备位置每秒更新；正式运行：列表切换需立即定位）
  const updateMarkers = (nextMarkers: JL1SatelliteMapProps['markers'], ol: any) => {
    if (!markerSourceRef.current) return;
    try {
      markerSourceRef.current.clear();
      if (!nextMarkers || nextMarkers.length === 0) return;
      const features = nextMarkers
        .filter(m => m.position && m.position.length === 2 && typeof m.position[0] === 'number' && typeof m.position[1] === 'number' && !isNaN(m.position[0]) && !isNaN(m.position[1]))
        .map((marker) => new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat(marker.position)),
          name: marker.label,
          type: marker.type,
        }));
      if (features.length) markerSourceRef.current.addFeatures(features);
    } catch (e) {
      console.warn('[JL1SatelliteMap] updateMarkers failed:', e);
    }
  };

  const updateTrajectories = (nextTrajectories: JL1SatelliteMapProps['trajectories'], ol: any) => {
    if (!trajectorySourceRef.current) return;
    try {
      trajectorySourceRef.current.clear();
      if (!nextTrajectories || nextTrajectories.length === 0) return;
      const features = nextTrajectories
        .filter(t => Array.isArray(t.path) && t.path.length >= 2)
        .map(t => {
          const coords = t.path
            .filter(p => p && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1]))
            .map(p => ol.proj.fromLonLat(p));
          if (coords.length < 2) return null;
          const f = new ol.Feature({ geometry: new ol.geom.LineString(coords) });
          const opacity = typeof t.opacity === 'number' ? t.opacity : (t.isActive ? 0.9 : 0.25);
          const baseColor = t.color || '#3b82f6';
          // 支持 hex + opacity / rgba 直接传
          const color = baseColor.startsWith('rgba') || baseColor.startsWith('rgb')
            ? baseColor
            : hexToRgba(baseColor, opacity);
          f.set('color', color);
          f.set('width', t.width ?? (t.isActive ? 4 : 2));
          return f;
        })
        .filter(Boolean);
      if (features.length) trajectorySourceRef.current.addFeatures(features);
    } catch (e) {
      console.warn('[JL1SatelliteMap] updateTrajectories failed:', e);
    }
  };

  const updateCompletedFields = (nextFields: JL1SatelliteMapProps['completedFields'], ol: any) => {
    if (!fieldSourceRef.current) return;
    try {
      fieldSourceRef.current.clear();
      if (!nextFields || nextFields.length === 0) return;
      const features = nextFields
        .filter(f => Array.isArray(f.boundary) && f.boundary.length >= 3)
        .map(f => {
          const ring = f.boundary
            .filter(p => p && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1]))
            .map(p => ol.proj.fromLonLat(p));
          if (ring.length < 3) return null;
          // 闭合
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
          const feature = new ol.Feature({ geometry: new ol.geom.Polygon([ring]) });
          feature.set('name', f.label);
          const opacity = typeof f.opacity === 'number' ? f.opacity : 0.22;
          feature.set('fillColor', f.fillColor || `rgba(245, 158, 11, ${opacity})`);
          feature.set('strokeColor', f.strokeColor || 'rgba(217, 119, 6, 0.9)');
          return feature;
        })
        .filter(Boolean);
      if (features.length) fieldSourceRef.current.addFeatures(features);
    } catch (e) {
      console.warn('[JL1SatelliteMap] updateCompletedFields failed:', e);
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    try {
      const h = hex.replace('#', '').trim();
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      const a = Math.max(0, Math.min(1, alpha));
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    } catch {
      return `rgba(59,130,246,${alpha})`;
    }
  };

  // markers 变化：实时更新
  useEffect(() => {
    if (!mapRef.current?.ol) return;
    updateMarkers(markers, mapRef.current.ol);
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current?.ol) return;
    updateTrajectories(trajectories, mapRef.current.ol);
  }, [trajectories]);

  useEffect(() => {
    if (!mapRef.current?.ol) return;
    updateCompletedFields(completedFields, mapRef.current.ol);
  }, [completedFields]);

  // center/zoom 变化：仅在非用户交互时自动跟随（避免拖拽/缩放冲突）
  useEffect(() => {
    if (!mapRef.current?.map || !mapRef.current?.ol) return;
    if (isInteractingRef.current) return;
    const view = mapRef.current.map.getView();
    const ol = mapRef.current.ol;
    const targetCenter = ol.proj.fromLonLat(center);
    const currentCenter = view.getCenter();
    if (!currentCenter) return;
    const dist = Math.sqrt(
      Math.pow(targetCenter[0] - currentCenter[0], 2) +
      Math.pow(targetCenter[1] - currentCenter[1], 2)
    );
    if (dist > 100 || Math.abs((view.getZoom() || zoom) - zoom) > 0.5) {
      view.animate({ center: targetCenter, zoom, duration: 450 });
    }
  }, [center, zoom]);

  // 缩放控制
  const handleZoomIn = () => {
    if (mapRef.current && mapRef.current.map) {
      const view = mapRef.current.map.getView();
      const newZoom = Math.min((view.getZoom() || currentZoom) + 1, 18);
      view.animate({ zoom: newZoom, duration: 250 });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current && mapRef.current.map) {
      const view = mapRef.current.map.getView();
      const newZoom = Math.max((view.getZoom() || currentZoom) - 1, 3);
      view.animate({ zoom: newZoom, duration: 250 });
    }
  };

  // 定位到中心
  const handleLocate = () => {
    if (mapRef.current && mapRef.current.map && mapRef.current.ol) {
      const view = mapRef.current.map.getView();
      view.animate({
        center: mapRef.current.ol.proj.fromLonLat(center),
        zoom: zoom,
        duration: 500,
      });
    }
  };

  // 切换图层类型
  const handleToggleMapType = () => {
    if (mapRef.current) {
      const { jl1Layer, osmLayer } = mapRef.current;
      const newType = mapType === 'satellite' ? 'vector' : 'satellite';
      setMapType(newType);
      
      if (jl1Layer && osmLayer) {
        jl1Layer.setVisible(newType === 'satellite');
        osmLayer.setVisible(newType === 'vector');
      }
    }
  };

  // 全屏切换
  const handleFullscreen = () => {
    if (mapContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapContainerRef.current.requestFullscreen();
      }
    }
  };

  // 重置旋转
  const handleResetRotation = () => {
    if (mapRef.current && mapRef.current.map) {
      mapRef.current.map.getView().animate({ rotation: 0, duration: 250 });
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 地图容器 */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-gray-900"
        style={{ minHeight: '400px' }}
      />

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-white text-sm">正在加载吉林一号卫星影像...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center p-4 bg-red-900/50 rounded-lg">
            <p className="text-red-400 mb-2">⚠️ {error}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      {!isLoading && !error && (
        <>
          {/* 左上角：数据来源标识 */}
          <div className="absolute top-3 left-3 z-20">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span>吉林一号卫星影像</span>
              </div>
              <div className="text-gray-400 text-[10px] mt-1">
                0.5米分辨率 | 长光卫星
              </div>
            </div>
          </div>

          {/* 右上角：吉林一号标识 + 图层切换 */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <div className="bg-green-600/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs flex items-center gap-1">
              <span>🛰️</span>
              <span>吉林一号</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleMapType}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0"
            >
              <Layers className="w-4 h-4 mr-1" />
              {mapType === 'satellite' ? '卫星' : '矢量'}
            </Button>
          </div>

          {/* 右侧：缩放和旋转控制 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleResetRotation}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
              title="重置旋转"
            >
              ⇧
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleFullscreen}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
              title="全屏"
            >
              ⤢
            </Button>
            <div className="my-2"></div>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs text-center">
              {currentZoom}
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
          </div>

          {/* 右下角：定位 */}
          <div className="absolute bottom-3 right-3 z-20 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleLocate}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
              title="回到中心"
            >
              <Locate className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleFullscreen}
              className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 w-10 h-10"
              title="全屏"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>

          {/* 左下角：比例尺 */}
          <div className="absolute bottom-3 left-3 z-20">
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-white text-xs">
              <div className="flex items-center gap-1">
                <div className="w-16 h-1 bg-white/80 rounded"></div>
                <span>{getScaleText(currentZoom)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 根据缩放级别计算比例尺文本
const getScaleText = (zoom: number): string => {
  const scales: { [key: number]: string } = {
    3: '2000km',
    4: '1000km',
    5: '500km',
    6: '200km',
    7: '100km',
    8: '50km',
    9: '20km',
    10: '10km',
    11: '5km',
    12: '2km',
    13: '1km',
    14: '500m',
    15: '200m',
    16: '100m',
    17: '50m',
    18: '20m',
  };
  return scales[zoom] || '1km';
};

export default JL1SatelliteMap;
