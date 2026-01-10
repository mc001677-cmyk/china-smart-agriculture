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

function normalizePath(pathname: string): string {
  // wouter 的 location 可能携带 query/hash；这里只用 pathname 部分
  const [p] = pathname.split(/[?#]/, 1);
  return p || "/";
}

export function getDashboardRouteInfo(location: string): DashboardRouteInfo | null {
  const path = normalizePath(location);
  const isSimulate = path.startsWith("/simulate");
  const isDashboard = path.startsWith("/dashboard");
  if (!isSimulate && !isDashboard) return null;

  const mode: DashboardMode = isSimulate ? "simulate" : "run";
  const base: DashboardRouteInfo["base"] = isSimulate ? "/simulate" : "/dashboard";

  // 兼容 /dashboard 与 /dashboard/:subpage 两种
  const rest = path.slice(base.length);
  const subpage = rest.startsWith("/") ? rest.slice(1) : "";
  const page = subpage || "overview";

  const topTab: TopNavTab = (() => {
    if (page === "work-monitor") return "operations";
    if (page === "trajectory") return "history";
    if (page === "yield-analysis") return "yield";

    if (page === "machine-market") return "machine-market";

    // 交易/协同模块（包含发布/追踪/评价/认证等）
    if (
      page === "marketplace" ||
      page === "publish-order" ||
      page === "order-tracking" ||
      page === "certification" ||
      page === "rating"
    ) {
      return "marketplace";
    }

    if (page === "smart-alerts") return "alerts";
    return "fleet";
  })();

  const leftTab: LeftPanelTab = (() => {
    // 维保
    if (page === "maintenance") return "maintenance";
    // 数据分析（暂用 yield-analysis）
    if (page === "yield-analysis") return "analytics";

    // 会员与认证相关（注意：当前顶栏入口会跳 onboarding）
    if (
      page === "membership" ||
      page === "onboarding" ||
      page === "identity" ||
      page === "bind-phone" ||
      page === "machine-register" ||
      page === "admin-review" ||
      page === "publish-machine"
    ) {
      return "membership";
    }

    // 默认：机队面板
    return "fleet";
  })();

  return { mode, base, subpage: page, topTab, leftTab };
}

