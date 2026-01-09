import { Globe, Tractor, Map, Activity, BarChart3, AlertTriangle, ChevronDown, Download, Maximize, Sun, Wind, Wheat, Languages, ShieldCheck, User, Crown, LogOut, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useFleet } from "@/contexts/FleetContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// 天气数据
const weatherData = {
  current: {
    temp: 7,
    condition: { zh: "晴", en: "Sunny" },
    icon: Sun,
    wind: 3.5,
    humidity: 55
  }
};

export default function CNHHeader() {
  const [location, setLocation] = useLocation();
  const { unresolvedAlertCount, fleet, allLogs } = useFleet();
  const { language, toggleLanguage, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: me } = trpc.auth.me.useQuery(undefined, { retry: 0 });
  const logout = trpc.auth.logout.useMutation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const to = (subpage?: string) => (subpage ? `${base}/${subpage}` : base);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalArea = 200000;
  const harvestedArea = allLogs
    .filter(log => log.workType === "收割")
    .reduce((sum, log) => sum + log.area, 0);
  const progressPercent = Math.min(100, (harvestedArea / totalArea) * 100);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = allLogs.filter(log => log.date === today);
  const todayArea = todayLogs.reduce((sum, log) => sum + log.area, 0);
  const todayYield = todayLogs.reduce((sum, log) => sum + log.yield, 0) / 1000;
  
  const workingCount = fleet.filter(m => m.status === "working").length;
  const totalCount = fleet.length;
  
  const getActiveTab = () => {
    if (location.includes("work-monitor")) return "operations";
    if (location.includes("trajectory")) return "history";
    if (location.includes("yield-analysis")) return "yield";
    if (location.includes("marketplace") || location.includes("publish-order") || location.includes("order-tracking") || location.includes("certification") || location.includes("rating")) return "marketplace";
    if (location.includes("machine-market")) return "machine-market";
    if (location.includes("smart-alerts")) return "alerts";
    return "fleet";
  };

  const activeTab = getActiveTab();

  const userName = (me as any)?.name || (me as any)?.realName || "未登录";
  const userPhone = (me as any)?.phone || "";
  const userRole = (me as any)?.role || "user";
  const verificationStatus = (me as any)?.verificationStatus || "unsubmitted";
  const membershipLevel = (me as any)?.membershipLevel || "free";
  const membershipExpiresAt = (me as any)?.membershipExpiresAt;
  const roleLabel = userRole === "admin" ? (language === "zh" ? "管理员" : "Admin") : (language === "zh" ? "用户" : "User");
  const verificationLabel =
    verificationStatus === "approved"
      ? (language === "zh" ? "已审核" : "Approved")
      : verificationStatus === "pending"
        ? (language === "zh" ? "审核中" : "Pending")
        : verificationStatus === "rejected"
          ? (language === "zh" ? "已驳回" : "Rejected")
          : (language === "zh" ? "未提交" : "Unsubmitted");

  const tabs = [
    // 注意：模拟运行必须保持 /simulate 前缀，否则会“跳回正式运行”
    { id: "fleet", label: t.nav.fleet, icon: Tractor, path: to() },
    { id: "operations", label: t.nav.operations, icon: Map, path: to("work-monitor") },
    { id: "history", label: t.nav.trajectory, icon: Activity, path: to("trajectory") },
    { id: "yield", label: t.nav.yield, icon: BarChart3, path: to("yield-analysis") },
    { id: "marketplace", label: t.nav.marketplace || "作业交易", icon: ShoppingCart, path: to("marketplace") },
    { id: "machine-market", label: "农机设备交易", icon: ShoppingCart, path: to("machine-market") },
    { id: "alerts", label: t.nav.alerts, icon: AlertTriangle, path: to("smart-alerts"), badge: unresolvedAlertCount },
  ];

  const CurrentIcon = userRole === "admin" ? ShieldCheck : User;
  const WeatherIcon = weatherData.current.icon;

  return (
    <header className="bg-gradient-to-r from-[#1a5f2a] via-[#228b3b] to-[#1a5f2a] text-white shadow-2xl z-[100] relative border-b-2 border-[#0d3d16]">
      {/* 主导航栏 */}
      <div className="h-16 flex items-center justify-between px-6">
        {/* 左侧: Logo */}
        <div className="flex items-center gap-4 w-72 shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700] via-[#FFC000] to-[#FFB000] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#e6b800] transform hover:scale-105 transition-all duration-300">
            <Globe className="h-7 w-7 text-[#1a5f2a]" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-wider leading-none bg-gradient-to-r from-white to-green-100 bg-clip-text">
              {t.brandName}
            </h1>
            <p className="text-[11px] text-[#FFD700] font-bold mt-1 tracking-widest">
              {t.brandSubtitle}
            </p>
          </div>
          {me && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 shadow-inner">
              <Crown className="h-4 w-4 text-[#FFD700]" />
              <span className="text-xs font-semibold text-white">
                {membershipLevel === "free" ? "免费版" : membershipLevel === "silver" ? "白银会员" : membershipLevel === "gold" ? "黄金会员" : "钻石会员"}
              </span>
            </div>
          )}
        </div>

        {/* 中间: 导航标签 */}
        <div className="flex-1 flex justify-center h-full px-4">
          <div className="flex h-full gap-0.5 items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setLocation(tab.path);
                }}
                className={cn(
                  "flex items-center gap-2 px-5 h-full text-sm font-bold transition-all duration-300 relative overflow-hidden group whitespace-nowrap",
                  activeTab === tab.id 
                    ? "text-white bg-[#0d3d16] shadow-[inset_0_-4px_0_0_#FFD700]" 
                    : "text-green-100 hover:text-white hover:bg-[#0d3d16]/50"
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity duration-300",
                  activeTab !== tab.id && "group-hover:opacity-100"
                )} />
                
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/15 to-transparent pointer-events-none" />
                )}

                <tab.icon className={cn(
                  "h-5 w-5 transition-all duration-300 flex-shrink-0",
                  activeTab === tab.id ? "scale-110 text-[#FFD700]" : "group-hover:scale-110"
                )} />
                <span className="relative z-10 tracking-wide hidden sm:inline">{tab.label}</span>
                
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-3 right-3 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg animate-pulse">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧: 操作按钮 */}
        <div className="flex items-center gap-2 w-auto justify-end shrink-0 px-2">
          {/* 语言切换按钮 */}
          <Button 
            variant="ghost" 
            onClick={toggleLanguage}
            className="h-9 px-2.5 text-white hover:bg-[#0d3d16] flex items-center gap-1.5 border border-[#3d9e4d] rounded-lg bg-[#228b3b]/50 shadow-md backdrop-blur-sm text-xs font-bold"
          >
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'zh' ? 'EN' : '中'}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2.5 text-white hover:bg-[#0d3d16] flex items-center gap-1.5 border border-[#3d9e4d] rounded-lg bg-[#228b3b]/50 shadow-md backdrop-blur-sm">
                <div className="p-1 rounded-full bg-emerald-500 shadow-md">
                  <CurrentIcon className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-bold hidden sm:inline">{userName}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-md border-gray-200 text-gray-800 z-[110] shadow-2xl rounded-xl">
              <DropdownMenuLabel className="text-gray-500 text-xs uppercase tracking-wider">
                {language === 'zh' ? '个人信息' : 'Profile'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="px-3 py-2 space-y-2 text-sm">
                <div className="font-semibold text-slate-900">{userName}</div>
                {userPhone && <div className="text-slate-600 text-xs">📞 {userPhone}</div>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px] border-emerald-500 text-emerald-700 bg-emerald-50">
                    {roleLabel}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] border-[#f59e0b] text-[#b45309] bg-amber-50">
                    {verificationLabel}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] border-blue-500 text-blue-700 bg-blue-50">
                    {membershipLevel === "free"
                      ? "免费版"
                      : membershipLevel === "silver"
                        ? "白银"
                        : membershipLevel === "gold"
                          ? "黄金"
                          : "钻石"}
                  </Badge>
                  {membershipExpiresAt && (
                    <Badge variant="outline" className="text-[11px] border-gray-300 text-gray-600 bg-gray-50">
                      到期：{new Date(membershipExpiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                  onClick={() => setLocation("/dashboard/onboarding")}
                >
                  {language === 'zh' ? '去注册与审核中心' : 'Go to onboarding'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                  onClick={() => setLocation("/dashboard/onboarding")}
                >
                  会员中心 / 升级
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                  onClick={async () => {
                    try {
                      await logout.mutateAsync();
                    } catch (e) {
                      // ignore
                    } finally {
                      setLocation("/login");
                    }
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                  onClick={async () => {
                    try {
                      await logout.mutateAsync();
                    } catch (e) {
                      // ignore
                    } finally {
                      setLocation("/login");
                    }
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  切换账号
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-7 w-px bg-[#3d9e4d]/50 hidden sm:block" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-green-100 hover:text-white hover:bg-[#0d3d16] active:scale-90 transition-all h-9 w-9 rounded-lg hidden sm:flex"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
          >
            <Maximize className="h-4 w-4" />
          </Button>
          
          <Avatar className="h-9 w-9 border-2 border-[#FFD700] shadow-lg">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
            <AvatarFallback className="bg-[#0d3d16] text-white font-bold">
              {userName.slice(0,1) || (language === 'zh' ? '用' : 'U')}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* 状态信息栏 */}
      <div className="h-12 bg-gradient-to-r from-[#0d3d16] via-[#145a24] to-[#0d3d16] flex items-center justify-between px-6 text-sm border-t border-[#3d9e4d]/30">
        {/* 左侧：收获进度 */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="text-green-200 font-semibold">
              {language === 'zh' ? '秋收进度' : 'Harvest Progress'}
            </span>
            <div className="w-56 h-3 bg-[#0a2912] rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFB000] rounded-full transition-all duration-700 shadow-lg"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[#FFD700] font-black text-lg">{progressPercent.toFixed(1)}%</span>
            <span className="text-green-300 text-xs font-medium">
              ({(harvestedArea / 10000).toFixed(1)}{language === 'zh' ? '万亩' : 'K acres'} / 20{language === 'zh' ? '万亩' : '0K acres'})
            </span>
          </div>
          
          <div className="h-6 w-px bg-[#3d9e4d]/40" />
          
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2 bg-[#0a2912]/50 px-3 py-1.5 rounded-lg">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <span className="text-green-200">{t.sidebar.working}</span>
              <span className="text-white font-black text-base">{workingCount}</span>
              <span className="text-green-300">/ {totalCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0a2912]/50 px-3 py-1.5 rounded-lg">
              <Wheat className="h-4 w-4 text-[#FFD700]" />
              <span className="text-green-200">{t.panel.todayHarvest}</span>
              <span className="text-[#FFD700] font-black text-base">{todayArea.toLocaleString()}</span>
              <span className="text-green-300">{t.panel.acres}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0a2912]/50 px-3 py-1.5 rounded-lg">
              <span className="text-green-200">{t.panel.todayYield}</span>
              <span className="text-[#FFD700] font-black text-base">{todayYield.toFixed(1)}</span>
              <span className="text-green-300">{t.panel.tons}</span>
            </div>
          </div>
        </div>

        {/* 右侧：天气和时间 */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 bg-[#0a2912]/60 rounded-xl px-4 py-2 backdrop-blur-sm border border-[#3d9e4d]/20">
            <div className="flex items-center gap-2">
              <WeatherIcon className="h-6 w-6 text-[#FFD700]" />
              <span className="text-white font-black text-lg">{weatherData.current.temp}°C</span>
              <span className="text-green-200 font-medium">{weatherData.current.condition[language]}</span>
            </div>
            <div className="h-5 w-px bg-[#3d9e4d]/40" />
            <div className="flex items-center gap-1.5 text-xs text-green-300">
              <Wind className="h-3.5 w-3.5" />
              <span>{weatherData.current.wind}m/s</span>
            </div>
            <div className="text-xs text-green-300">
              {t.weather.humidity} {weatherData.current.humidity}%
            </div>
          </div>

          <div className="text-right bg-[#0a2912]/60 rounded-xl px-4 py-2 backdrop-blur-sm border border-[#3d9e4d]/20">
            <div className="text-white font-black text-lg font-mono tracking-wider">
              {currentTime.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-green-300 text-[10px] font-medium">
              {currentTime.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
