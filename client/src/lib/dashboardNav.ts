import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Crown,
  Map as MapIcon,
  Settings as SettingsIcon,
  ShoppingCart,
  Tractor,
  Wrench,
} from "lucide-react";

export type DashboardMode = "run" | "simulate";

export type TopNavTab =
  | "fleet"
  | "operations"
  | "history"
  | "yield"
  | "marketplace"
  | "machine-market"
  | "alerts";

export type LeftPanelTab = "fleet" | "maintenance" | "analytics" | "membership" | "settings";

export type DashboardRouteInfo = {
  mode: DashboardMode;
  base: "/dashboard" | "/simulate";
  subpage: string; // e.g. "membership", "overview"
  topTab: TopNavTab;
  leftTab: LeftPanelTab;
};

export type DashboardTopNavItem = {
  id: TopNavTab;
  icon: LucideIcon;
  /**
   * "" 表示 base 路由（/dashboard 或 /simulate）
   * 其他为 subpage（/dashboard/:subpage）
   */
  subpage: "" | string;
  /**
   * 如果 t.nav 不包含该 key，可用 labelZh/labelEn 兜底
   */
  labelKey?: "fleet" | "operations" | "trajectory" | "yield" | "marketplace" | "alerts";
  labelZh?: string;
  labelEn?: string;
};

export type DashboardLeftNavItem = {
  id: LeftPanelTab;
  icon: LucideIcon;
  /**
   * 点击一级图标时的默认落点（subpage）
   */
  defaultSubpage: "" | string;
  labelKey?: "fleetManagement" | "maintenance" | "analytics" | "settings";
  labelZh?: string;
  labelEn?: string;
};

/**
 * 单一配置源：顶栏 Tab（一级模块）
 * - 所有跳转都应由这里生成路径，避免散落硬编码。
 */
export const DASHBOARD_TOP_NAV: DashboardTopNavItem[] = [
  { id: "fleet", icon: Tractor, subpage: "", labelKey: "fleet" },
  { id: "operations", icon: MapIcon, subpage: "work-monitor", labelKey: "operations" },
  { id: "history", icon: Activity, subpage: "trajectory", labelKey: "trajectory" },
  { id: "yield", icon: BarChart3, subpage: "yield-analysis", labelKey: "yield" },
  { id: "marketplace", icon: ShoppingCart, subpage: "marketplace", labelKey: "marketplace" },
  { id: "machine-market", icon: ShoppingCart, subpage: "machine-market", labelZh: "农机设备交易", labelEn: "Machine Market" },
  { id: "alerts", icon: AlertTriangle, subpage: "smart-alerts", labelKey: "alerts" },
];

/**
 * 单一配置源：左侧一级图标导航（路由驱动）
 */
export const DASHBOARD_LEFT_NAV: DashboardLeftNavItem[] = [
  { id: "fleet", icon: Tractor, defaultSubpage: "", labelKey: "fleetManagement" },
  { id: "maintenance", icon: Wrench, defaultSubpage: "maintenance", labelKey: "maintenance" },
  { id: "analytics", icon: BarChart3, defaultSubpage: "yield-analysis", labelKey: "analytics" },
  { id: "membership", icon: Crown, defaultSubpage: "onboarding", labelZh: "会员中心", labelEn: "Membership" },
  { id: "settings", icon: SettingsIcon, defaultSubpage: "settings", labelKey: "settings" },
];

/**
 * 单一配置源：subpage → 顶栏/侧栏的选中态映射
 * - 用于高亮与左侧面板跟随路由
 */
export const DASHBOARD_SUBPAGE_META: Record<
  string,
  { topTab: TopNavTab; leftTab: LeftPanelTab }
> = {
  overview: { topTab: "fleet", leftTab: "fleet" },
  fields: { topTab: "fleet", leftTab: "settings" },
  machines: { topTab: "fleet", leftTab: "fleet" },
  planning: { topTab: "fleet", leftTab: "fleet" },
  reports: { topTab: "fleet", leftTab: "fleet" },
  alerts: { topTab: "fleet", leftTab: "fleet" },
  history: { topTab: "fleet", leftTab: "fleet" },
  worklogs: { topTab: "fleet", leftTab: "fleet" },

  maintenance: { topTab: "fleet", leftTab: "maintenance" },

  "work-monitor": { topTab: "operations", leftTab: "fleet" },
  trajectory: { topTab: "history", leftTab: "fleet" },
  "yield-analysis": { topTab: "yield", leftTab: "analytics" },
  "smart-alerts": { topTab: "alerts", leftTab: "fleet" },

  marketplace: { topTab: "marketplace", leftTab: "fleet" },
  "publish-order": { topTab: "marketplace", leftTab: "fleet" },
  "order-tracking": { topTab: "marketplace", leftTab: "fleet" },
  certification: { topTab: "marketplace", leftTab: "fleet" },
  rating: { topTab: "marketplace", leftTab: "fleet" },

  "machine-market": { topTab: "machine-market", leftTab: "fleet" },

  onboarding: { topTab: "fleet", leftTab: "membership" },
  membership: { topTab: "fleet", leftTab: "membership" },
  identity: { topTab: "fleet", leftTab: "membership" },
  "bind-phone": { topTab: "fleet", leftTab: "membership" },
  "machine-register": { topTab: "fleet", leftTab: "membership" },
  "publish-machine": { topTab: "fleet", leftTab: "membership" },

  settings: { topTab: "fleet", leftTab: "settings" },
};

function normalizePath(pathname: string): string {
  // wouter 的 location 可能携带 query/hash；这里只用 pathname 部分
  const [p] = pathname.split(/[?#]/, 1);
  return p || "/";
}

export function getDashboardBaseFromLocation(location: string): { mode: DashboardMode; base: DashboardRouteInfo["base"] } | null {
  const path = normalizePath(location);
  const isSimulate = path.startsWith("/simulate");
  const isDashboard = path.startsWith("/dashboard");
  if (!isSimulate && !isDashboard) return null;
  const mode: DashboardMode = isSimulate ? "simulate" : "run";
  const base: DashboardRouteInfo["base"] = isSimulate ? "/simulate" : "/dashboard";
  return { mode, base };
}

/**
 * 在不知道当前是否 simulate 的情况下，根据 location 构建正确前缀的跳转路径
 */
export function toDashboardPath(location: string, subpage?: string): string {
  const info = getDashboardBaseFromLocation(location);
  const base = info?.base ?? "/dashboard";
  if (!subpage) return base;
  return `${base}/${subpage}`;
}

export function getDashboardRouteInfo(location: string): DashboardRouteInfo | null {
  const path = normalizePath(location);
  const baseInfo = getDashboardBaseFromLocation(path);
  if (!baseInfo) return null;
  const { mode, base } = baseInfo;

  // 兼容 /dashboard 与 /dashboard/:subpage 两种
  const rest = path.slice(base.length);
  const subpage = rest.startsWith("/") ? rest.slice(1) : "";
  const page = subpage || "overview";

  const meta = DASHBOARD_SUBPAGE_META[page] ?? DASHBOARD_SUBPAGE_META.overview;
  const topTab: TopNavTab = meta.topTab;
  const leftTab: LeftPanelTab = meta.leftTab;

  return { mode, base, subpage: page, topTab, leftTab };
}

