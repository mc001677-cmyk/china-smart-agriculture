import { ReactNode, useMemo } from "react";
import JL1SatelliteMap from "./JL1SatelliteMap";
import CNHHeader from "./CNHHeader";
import CNHSidebar from "./CNHSidebar";
import { RightPanel } from "./RightPanel";
import { FleetProvider, useFleet } from "@/contexts/FleetContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useField } from "@/contexts/FieldContext";

interface DashboardLayoutProps {
  children?: ReactNode;
  /**
   * 运行模式：
   * - "run"      正式运行（默认）
   * - "simulate" 模拟运行（演示 / 培训）
   */
  mode?: "run" | "simulate";
}

function DashboardMap({ mode }: { mode: "run" | "simulate" }) {
  const { fleet, activeMachineId, selectedDate, getDailyTrajectory } = useFleet();
  const { fields } = useField();

  const markers = useMemo(() => {
    return fleet
      .filter(m => typeof m.lng === "number" && typeof m.lat === "number" && !isNaN(m.lng) && !isNaN(m.lat))
      .map(m => ({
        id: String(m.id),
        position: [m.lng, m.lat] as [number, number],
        label: m.name,
        type: "equipment" as const,
      }));
  }, [fleet]);

  const focus = useMemo(() => {
    if (!activeMachineId) return null;
    const m = fleet.find(x => x.id === activeMachineId);
    if (!m) return null;
    if (typeof m.lng !== "number" || typeof m.lat !== "number" || isNaN(m.lng) || isNaN(m.lat)) return null;
    return [m.lng, m.lat] as [number, number];
  }, [activeMachineId, fleet]);

  const brandColor = (brand?: string) => {
    switch (brand) {
      case "john_deere": return "#367C2B";
      case "case_ih": return "#C8102E";
      case "new_holland": return "#005BBB";
      case "claas": return "#00A651";
      default: return "#3b82f6";
    }
  };

  const trajectories = useMemo(() => {
    if (mode !== "simulate") return [];
    return fleet
      .map(m => {
        const traj = getDailyTrajectory(m.id, selectedDate);
        if (!traj || !Array.isArray(traj.path) || traj.path.length < 2) return null;
        const isActive = activeMachineId === m.id;
        return {
          id: `traj_${m.id}_${selectedDate}`,
          path: traj.path as [number, number][],
          color: brandColor(m.brand),
          width: isActive ? 4 : 2,
          opacity: isActive ? 0.9 : 0.22,
          isActive,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        path: [number, number][];
        color: string;
        width: number;
        opacity: number;
        isActive: boolean;
      }>;
  }, [mode, fleet, getDailyTrajectory, selectedDate, activeMachineId]);

  const completedFields = useMemo(() => {
    if (mode !== "simulate") return [];
    return fields
      .filter(f => f.status === "completed" || f.harvestProgress >= 100)
      .filter(f => Array.isArray(f.boundary) && f.boundary.length >= 3)
      .map(f => ({
        id: `field_${f.id}`,
        boundary: f.boundary,
        label: `${f.name}（已完成）`,
        // 丰收金：完成地块高亮
        fillColor: "rgba(245, 158, 11, 0.22)",
        strokeColor: "rgba(217, 119, 6, 0.95)",
      }));
  }, [mode, fields]);

  return (
    <JL1SatelliteMap
      className="absolute inset-0"
      center={focus ?? [131.85, 46.85]}
      zoom={focus ? 16 : 12}
      markers={markers}
      trajectories={trajectories}
      completedFields={completedFields}
    />
  );
}

export default function DashboardLayout({ children, mode = "run" }: DashboardLayoutProps) {
  return (
    <LanguageProvider>
      <FleetProvider>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f5f5f7] font-sans antialiased">
          {/* 顶部导航栏 */}
          <CNHHeader />

          {/* 主内容区域 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧边栏 - 机队管理 */}
            <CNHSidebar />

            {/* 中央地图区域 */}
            <main className="flex-1 relative">
              {/* 模式提示徽标：左上角显示当前模式 */}
              <div className="absolute top-3 left-4 z-30 flex items-center gap-2">
                <span
                  className={
                    mode === "simulate"
                      ? "inline-flex items-center rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      : "inline-flex items-center rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                  }
                >
                  {mode === "simulate" ? "模拟运行模式" : "正式运行模式"}
                </span>
              </div>

              {/* 吉林一号卫星地图作为唯一底图 */}
              <DashboardMap mode={mode} />

              {/* 子内容覆盖层 */}
              {children && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                  {children}
                </div>
              )}
            </main>

            {/* 右侧面板 - 设备详情 */}
            <RightPanel />
          </div>
        </div>
      </FleetProvider>
    </LanguageProvider>
  );
}
