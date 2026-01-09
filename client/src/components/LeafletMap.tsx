import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { FARM_CONFIG, BRAND_CONFIG } from '../lib/config';
import { MapPin, Layers, Navigation, ZoomIn, ZoomOut } from 'lucide-react';

// Leaflet CSS will be loaded dynamically
declare global {
  interface Window {
    L: any;
  }
}

interface LeafletMapProps {
  className?: string;
}

export function LeafletMap({ className }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'map'>('satellite');
  const [showYieldOverlay, setShowYieldOverlay] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  
  const { fleet, activeMachineId, setActiveMachineId } = useFleet();

  // Load Leaflet library
  useEffect(() => {
    if (window.L) {
      setMapReady(true);
      return;
    }

    // Load Leaflet CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;
    const { center, defaultZoom } = FARM_CONFIG;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // ========== 吉林一号卫星影像图层 (0.5米高清分辨率) ==========
    // 注意: 需要在吉林一号网注册获取 mk 和 tk 密钥
    // 官网: https://www.jl1mall.com/
    // 申请指南: /home/ubuntu/china-smart-agriculture/JL1_APPLY_GUIDE.md
    // const JL1_CONFIG = {
    //   mk: 'YOUR_MK_HERE',  // 替换为您的MK
    //   tk: 'YOUR_TK_HERE'   // 替换为您的TK
    // };
    // const jl1SatelliteLayer = L.tileLayer(
    //   `https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=${JL1_CONFIG.mk}&tk=${JL1_CONFIG.tk}`,
    //   { maxZoom: 18, minZoom: 1, attribution: '© 吉林一号卫星 | 长光卫星' }
    // );
    // ========== 吉林一号配置结束 ==========

    // 卫星图层 (Google Maps)
    const satelliteLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
    );

    // 普通地图图层 (Google Maps)
    const mapLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
    );

    // Add default layer
    satelliteLayer.addTo(map);

    // Store references
    mapRef.current = map;
    (map as any)._satelliteLayer = satelliteLayer;
    (map as any)._mapLayer = mapLayer;
    (map as any)._currentLayer = 'satellite';

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady]);

  // Switch map type
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const L = window.L;

    if (mapType === 'satellite' && map._currentLayer !== 'satellite') {
      map.removeLayer(map._mapLayer);
      map._satelliteLayer.addTo(map);
      map._currentLayer = 'satellite';
    } else if (mapType === 'map' && map._currentLayer !== 'map') {
      map.removeLayer(map._satelliteLayer);
      map._mapLayer.addTo(map);
      map._currentLayer = 'map';
    }
  }, [mapType]);

  // Update markers when fleet changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current.clear();

    // Add new markers
    fleet.forEach(machine => {
      const brandConfig = BRAND_CONFIG[machine.brand as keyof typeof BRAND_CONFIG];
      const isActive = machine.id === activeMachineId;
      const isWorking = machine.status === 'working';
      const isMoving = machine.status === 'moving';

      // Create custom icon
      const iconHtml = `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${isWorking ? `
            <div style="
              position: absolute;
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: rgba(52, 199, 89, 0.3);
              animation: pulse 2s infinite;
            "></div>
          ` : ''}
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${isActive ? '#007AFF' : isWorking ? '#34C759' : isMoving ? '#FF9500' : '#8E8E93'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            font-weight: bold;
          ">
            ${machine.type === 'harvester' ? '🚜' : '🚛'}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([machine.lat, machine.lng], { icon })
        .addTo(map)
        .on('click', () => setActiveMachineId(machine.id));

      // Add tooltip
      marker.bindTooltip(
        `<div style="font-weight: bold; white-space: nowrap;">${brandConfig?.name || machine.brand} ${machine.model}</div>`,
        { permanent: false, direction: 'top', offset: [0, -20] }
      );

      markersRef.current.set(machine.id, marker);
    });

    // Add pulse animation style
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .custom-marker { background: transparent !important; border: none !important; }
      `;
      document.head.appendChild(style);
    }
  }, [fleet, activeMachineId, mapReady, setActiveMachineId]);

  // Center on active machine
  useEffect(() => {
    if (!mapRef.current || !activeMachineId) return;
    
    const machine = fleet.find(m => m.id === activeMachineId);
    if (machine) {
      mapRef.current.setView([machine.lat, machine.lng], 16, {
        animate: true,
        duration: 0.5
      });
    }
  }, [activeMachineId, fleet]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      const { center, defaultZoom } = FARM_CONFIG;
      mapRef.current.setView([center.lat, center.lng], defaultZoom, {
        animate: true,
        duration: 0.5
      });
    }
  }, []);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Loading indicator */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-gray-500">加载地图中...</div>
        </div>
      )}

      {/* Zoom Controls - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleResetView}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        >
          <Navigation className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Yield Legend - Top Right Below Zoom */}
      {showYieldOverlay && (
        <div className="absolute top-36 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">产量图例</div>
          <div className="space-y-1">
            {[
              { color: '#22c55e', label: '> 640 kg/亩' },
              { color: '#84cc16', label: '480-640' },
              { color: '#eab308', label: '320-480' },
              { color: '#f97316', label: '160-320' },
              { color: '#ef4444', label: '< 160' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Type Toggle - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-1">
        <button
          onClick={() => setMapType('map')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mapType === 'map' 
              ? 'bg-green-500 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          地图
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mapType === 'satellite' 
              ? 'bg-green-500 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
卫星
        </button>
        <button
          onClick={() => setShowYieldOverlay(!showYieldOverlay)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showYieldOverlay 
              ? 'bg-green-500 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          产量
        </button>
      </div>

      {/* Legend Toggle - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        >
          <Layers className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Legend Panel */}
      {showLegend && (
        <div className="absolute bottom-16 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 min-w-[160px]">
          <div className="text-sm font-medium text-gray-700 mb-3">设备状态</div>
          <div className="space-y-2">
            {[
              { color: '#34C759', label: '作业中' },
              { color: '#FF9500', label: '移动中' },
              { color: '#8E8E93', label: '空闲' },
              { color: '#FF3B30', label: '离线' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default LeafletMap;
