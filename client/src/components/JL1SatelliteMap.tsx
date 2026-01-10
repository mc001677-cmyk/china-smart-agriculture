import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, ZoomIn, ZoomOut, Locate, Maximize2 } from 'lucide-react';

// 吉林一号卫星影像配置（从环境变量读取，避免把密钥写死在代码里）
const JL1_MK = import.meta.env.VITE_JL1_MAP_MK || "";
const JL1_TK = import.meta.env.VITE_JL1_MAP_TK || "";
const JL1_BASE_URL = import.meta.env.VITE_JL1_MAP_BASE_URL ?? "https://api.jl1mall.com/getMap";
const JL1_PRO = import.meta.env.VITE_JL1_MAP_PRO || ""; // 可选：企业版/项目ID
const HAS_JL1_CREDS = Boolean(JL1_MK && JL1_TK);

const JL1_CONFIG = {
  mk: JL1_MK,
  tk: JL1_TK,
  getTileUrl: (z: number, x: number, y: number) => {
    // TMS 格式需要翻转 Y 轴（等价于瓦片模板中的 {-y}）
    const tmsY = Math.pow(2, z) - 1 - y;
    const pro = JL1_PRO ? `&_pro=${encodeURIComponent(JL1_PRO)}` : "";
    return `${JL1_BASE_URL}/${z}/${x}/${tmsY}?mk=${encodeURIComponent(JL1_MK)}&tk=${encodeURIComponent(JL1_TK)}${pro}`;
  },
};

const OL_CSS_URLS = [
  "https://cdn.jsdelivr.net/npm/ol@7.5.2/ol.css",
  "https://unpkg.com/ol@7.5.2/ol.css",
];
const OL_JS_URLS = [
  "https://cdn.jsdelivr.net/npm/ol@7.5.2/dist/ol.js",
  "https://unpkg.com/ol@7.5.2/dist/ol.js",
];

function ensureCss(urls: string[]) {
  if (document.querySelector('link[data-ol-css="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = urls[0];
  link.setAttribute("data-ol-css", "1");
  document.head.appendChild(link);
}

async function loadScript(src: string): Promise<void> {
  // 已存在同 src 的脚本则复用
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

async function loadOlWithFallback(): Promise<void> {
  if (window.ol) return;

  // FIX: 优先加载本地 JL1 SDK（包含 OpenLayers 及相关依赖），避免外网 CDN 波动
  try {
    await loadScript("/JL1Map.umd.min.js");
    if (window.ol) return;
  } catch {
    // ignore and fallback to CDN
  }

  for (const url of OL_JS_URLS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.setAttribute("data-ol-src", url);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load OpenLayers from ${url}`));
        document.head.appendChild(s);
      });

      // 等待 ol 对象可用
      await new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const timer = window.setInterval(() => {
          if (window.ol) {
            window.clearInterval(timer);
            resolve();
          } else if (Date.now() - start > 8000) {
            window.clearInterval(timer);
            reject(new Error("Timeout waiting for window.ol"));
          }
        }, 50);
      });

      return;
    } catch {
      // 继续尝试下一 CDN
      continue;
    }
  }
  throw new Error("无法加载 OpenLayers（请检查网络或 CDN 可用性）");
}

async function probeJl1Tile(baseUrl: string, mk: string, tk: string): Promise<boolean> {
  // FIX: 用一张瓦片做连通性探测，严格校验“真的可用”再切到 JL1
  // - 兼容服务端返回 200 但头部 status=7103（常见为无权限/无数据/风控拦截占位）
  // - 校验 Content-Type 必须为 image/*
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    const pro = JL1_PRO ? `&_pro=${encodeURIComponent(JL1_PRO)}` : "";
    const url = `${baseUrl}/1/1/1?mk=${encodeURIComponent(mk)}&tk=${encodeURIComponent(tk)}${pro}&_ts=${Date.now()}`;

    const resp = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    window.clearTimeout(timer);
    if (!resp.ok) return false;

    const ct = resp.headers.get("content-type") || "";
    if (!ct.toLowerCase().startsWith("image/")) return false;

    const jl1Status = resp.headers.get("status"); // 注意：这是“响应头字段名 status”，不是 HTTP status code
    if (jl1Status && jl1Status !== "200") return false;

    return true;
  } catch {
    return false;
  }
}


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
  onFeatureClick?: (feature: { type?: 'equipment' | 'field' | 'warning'; id?: string; name?: string }) => void;
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
  onFeatureClick,
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
  const jl1FailCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseMapNotice, setBaseMapNotice] = useState<string | null>(null);
  const [jl1Available, setJl1Available] = useState(HAS_JL1_CREDS);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [mapType, setMapType] = useState<'satellite' | 'vector'>(HAS_JL1_CREDS ? 'satellite' : 'vector');

  // 加载 OpenLayers 和 JL1Map SDK
  useEffect(() => {
    const loadScripts = async () => {
      // FIX: OpenLayers 使用多 CDN 回退，避免单点网络失败导致地图黑屏
      ensureCss(OL_CSS_URLS);
      await loadOlWithFallback();
    };

    const initMap = async () => {
      try {
        await loadScripts();
        
        if (!mapContainerRef.current || !window.ol) return;

        const ol = window.ol;

        // FIX: 若配置了吉林一号密钥，先做瓦片探测：失败则直接降级 OSM
        const jl1TileOk = HAS_JL1_CREDS
          ? await probeJl1Tile(JL1_BASE_URL, JL1_MK, JL1_TK)
          : false;

        // 创建吉林一号卫星影像图层
        const jl1Layer = new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: `${JL1_BASE_URL}/{z}/{x}/{-y}?mk=${JL1_CONFIG.mk}&tk=${JL1_CONFIG.tk}`,
            projection: 'EPSG:3857',
            crossOrigin: 'anonymous',
            tileLoadFunction: (imageTile: any, src: string) => {
              // 自定义切片加载函数，处理 {-y} 占位符
              const z = imageTile.getTileCoord()[0];
              const x = imageTile.getTileCoord()[1];
              const y = imageTile.getTileCoord()[2];
              // TMS Y 轴翻转
              const url = JL1_CONFIG.getTileUrl(z, x, y);
              const img: HTMLImageElement = imageTile.getImage();
              img.onerror = () => {
                // 连续失败时自动降级到 OSM，避免黑屏
                jl1FailCountRef.current += 1;
              };
              img.src = url;
            }
          }),
          visible: true,
        });

        // 创建 OpenStreetMap 底图作为备用
        const osmLayer = new ol.layer.Tile({
          source: new ol.source.OSM(),
          visible: false,
        });

        // 若未配置吉林一号密钥：直接使用 OSM 底图，并提示
        if (!HAS_JL1_CREDS) {
          jl1Layer.setVisible(false);
          osmLayer.setVisible(true);
          setMapType('vector');
          setJl1Available(false);
          setBaseMapNotice('未配置吉林一号密钥，已自动切换到矢量底图（OSM）。请在 .env 配置 VITE_JL1_MAP_MK / VITE_JL1_MAP_TK');
        } else if (!jl1TileOk) {
          // 已配置但不可用：提示并降级
          jl1Layer.setVisible(false);
          osmLayer.setVisible(true);
          setMapType('vector');
          setJl1Available(false);
          setBaseMapNotice('吉林一号卫星影像不可用：请检查 mk/tk 是否有效、网络是否可访问 jl1mall（已自动切换到 OSM）。');
        } else {
          setJl1Available(true);
          setBaseMapNotice(null);
        }

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
        setError(null);

        // 若已配置 JL1：监控瓦片加载失败，连续失败则降级到 OSM
        if (HAS_JL1_CREDS) {
          jl1FailCountRef.current = 0;
          const timer = window.setInterval(() => {
            // 连续失败达到阈值后降级（避免偶发抖动）
            if (jl1FailCountRef.current >= 3 && mapRef.current?.jl1Layer && mapRef.current?.osmLayer) {
              mapRef.current.jl1Layer.setVisible(false);
              mapRef.current.osmLayer.setVisible(true);
              setMapType('vector');
              setJl1Available(false);
              setBaseMapNotice('吉林一号瓦片加载失败，已自动切换到矢量底图（OSM）。请检查 mk/tk 是否有效、网络是否可访问 jl1mall');
              window.clearInterval(timer);
            }
          }, 1200);
          // 清理：随地图销毁
          (map as any).__jl1FailWatchTimer = timer;
        }
        
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

        // 点击交互：点击点位/地块回调给上层（用于“地图工作台”联动）
        map.on('singleclick', (evt: any) => {
          try {
            if (!onFeatureClick) return;
            const feature = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
            if (!feature) return;
            const type = feature.get('type');
            const id = feature.get('id');
            const name = feature.get('name');
            onFeatureClick({ type, id, name });
          } catch (e) {
            console.warn('[JL1SatelliteMap] feature click failed:', e);
          }
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
          const t = (mapRef.current.map as any).__jl1FailWatchTimer;
          if (t) window.clearInterval(t);
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
          id: marker.id,
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
          feature.set('id', f.id);
          feature.set('name', f.label);
          feature.set('type', 'field');
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
      // JL1 不可用时禁止切回卫星底图，避免再次黑屏
      if (newType === 'satellite' && !jl1Available) {
        setBaseMapNotice('卫星影像不可用：请配置 VITE_JL1_MAP_MK / VITE_JL1_MAP_TK，或检查吉林一号服务可用性');
        return;
      }
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
                <span>{mapType === 'satellite' ? '吉林一号卫星影像' : 'OpenStreetMap 矢量底图'}</span>
              </div>
              <div className="text-gray-400 text-[10px] mt-1">
                {mapType === 'satellite' ? '0.5米分辨率 | 长光卫星' : '备用底图 | OSM'}
              </div>
            </div>
          </div>

          {/* 顶部：底图降级提示（非致命） */}
          {baseMapNotice && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-[720px] px-4">
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-100 text-xs rounded-xl px-3 py-2 backdrop-blur-sm">
                {baseMapNotice}
              </div>
            </div>
          )}

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
