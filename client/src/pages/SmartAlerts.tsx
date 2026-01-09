import { useState, useMemo } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, Bell, CheckCircle2, XCircle, Clock, 
  Filter, Search, Fuel, Wrench, Heart, MapPin, Timer,
  TrendingDown, Settings, BellRing, BellOff, MoreVertical,
  ChevronRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AlertRecord } from "@/lib/historyGenerator";

// Alert type icons and colors
const alertConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  fuel: { icon: Fuel, color: "text-amber-600", bgColor: "bg-amber-100" },
  maintenance: { icon: Wrench, color: "text-blue-600", bgColor: "bg-blue-100" },
  health: { icon: Heart, color: "text-red-600", bgColor: "bg-red-100" },
  geofence: { icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-100" },
  idle: { icon: Timer, color: "text-orange-600", bgColor: "bg-orange-100" },
  efficiency: { icon: TrendingDown, color: "text-gray-600", bgColor: "bg-gray-100" },
};

// Alert severity colors
const severityColors: Record<string, { badge: string; border: string }> = {
  error: { badge: "bg-red-100 text-red-700 border-red-200", border: "border-l-red-500" },
  warning: { badge: "bg-amber-100 text-amber-700 border-amber-200", border: "border-l-amber-500" },
  info: { badge: "bg-blue-100 text-blue-700 border-blue-200", border: "border-l-blue-500" },
};

// Summary stat card
const AlertStatCard = ({ icon: Icon, title, value, color, bgColor }: {
  icon: any;
  title: string;
  value: number;
  color: string;
  bgColor: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl", bgColor)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </CardContent>
  </Card>
);

// Single alert card
const AlertCard = ({ alert, onResolve, onSelect, isSelected }: {
  alert: AlertRecord;
  onResolve: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) => {
  const config = alertConfig[alert.category] || alertConfig.efficiency;
  const severity = severityColors[alert.type] || severityColors.info;
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all border-l-4 hover:shadow-md",
        severity.border,
        isSelected && "ring-2 ring-green-200 bg-green-50/30",
        alert.resolved && "opacity-60"
      )}
      onClick={() => onSelect(alert.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
              <Badge variant="outline" className={cn("text-xs", severity.badge)}>
                {alert.type === "error" ? "严重" : alert.type === "warning" ? "警告" : "提示"}
              </Badge>
              {alert.resolved && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已处理
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: zhCN })}
              </span>
              <span>{format(alert.timestamp, 'MM-dd HH:mm')}</span>
            </div>
          </div>
          {!alert.resolved && (
            <Button 
              variant="outline" 
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(alert.id);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              处理
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Alert detail panel
const AlertDetailPanel = ({ alert, onResolve, onClose }: {
  alert: AlertRecord | null;
  onResolve: (id: string) => void;
  onClose: () => void;
}) => {
  if (!alert) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>选择一条警报查看详情</p>
        </div>
      </div>
    );
  }

  const config = alertConfig[alert.category] || alertConfig.efficiency;
  const severity = severityColors[alert.type] || severityColors.info;
  const Icon = config.icon;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">警报详情</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn("p-3 rounded-xl", config.bgColor)}>
              <Icon className={cn("w-6 h-6", config.color)} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{alert.title}</h2>
              <Badge variant="outline" className={cn("text-xs mt-1", severity.badge)}>
                {alert.type === "error" ? "严重" : alert.type === "warning" ? "警告" : "提示"}
              </Badge>
            </div>
          </div>

          {/* Status */}
          <Card className={alert.resolved ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {alert.resolved ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700">已处理</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-700">待处理</span>
                  </>
                )}
              </div>
              {alert.resolved && alert.resolvedAt && (
                <p className="text-sm text-green-600 mt-1">
                  处理时间: {format(alert.resolvedAt, 'yyyy-MM-dd HH:mm:ss')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">详细信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">设备名称</span>
                <span className="font-medium">{alert.machineName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">警报类型</span>
                <span className="font-medium capitalize">{alert.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">触发时间</span>
                <span className="font-medium">{format(alert.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">警报描述</p>
                <p className="text-sm text-gray-900">{alert.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">建议操作</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {alert.category === "fuel" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>安排加油车前往设备位置</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>通知操作员就近加油站位置</span>
                    </li>
                  </>
                )}
                {alert.category === "maintenance" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>联系维修团队安排保养</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>检查保养配件库存</span>
                    </li>
                  </>
                )}
                {alert.category === "health" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>立即检查设备健康状态</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>考虑暂停作业进行检修</span>
                    </li>
                  </>
                )}
                {alert.category === "geofence" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>确认设备当前位置</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>联系操作员确认作业计划</span>
                    </li>
                  </>
                )}
                {alert.category === "idle" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>联系操作员了解情况</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>考虑关闭发动机节省燃油</span>
                    </li>
                  </>
                )}
                {alert.category === "efficiency" && (
                  <>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>检查作业参数设置</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-500" />
                      <span>评估地块条件是否影响效率</span>
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Action Button */}
          {!alert.resolved && (
            <Button 
              className="w-full"
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              标记为已处理
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default function SmartAlerts() {
  const { alerts, resolveAlert, unresolvedAlertCount } = useFleet();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    
    // Tab filter
    if (selectedTab === "unresolved") {
      result = result.filter(a => !a.resolved);
    } else if (selectedTab === "resolved") {
      result = result.filter(a => a.resolved);
    }
    
    // Category filter
    if (categoryFilter.length > 0) {
      result = result.filter(a => categoryFilter.includes(a.category));
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.message.toLowerCase().includes(query) ||
        a.machineName.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [alerts, selectedTab, categoryFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: alerts.length,
    unresolved: alerts.filter(a => !a.resolved).length,
    error: alerts.filter(a => a.type === "error" && !a.resolved).length,
    warning: alerts.filter(a => a.type === "warning" && !a.resolved).length,
  }), [alerts]);

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || null;

  const toggleCategory = (category: string) => {
    setCategoryFilter(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-500" />
                智能警报
                {unresolvedAlertCount > 0 && (
                  <Badge className="bg-red-500 text-white ml-2">
                    {unresolvedAlertCount} 待处理
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                设备异常监测与维护提醒 · 共 {alerts.length} 条警报记录
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                设置
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4">
          <AlertStatCard 
            icon={Bell}
            title="全部警报"
            value={stats.total}
            color="text-gray-600"
            bgColor="bg-gray-100"
          />
          <AlertStatCard 
            icon={AlertTriangle}
            title="待处理"
            value={stats.unresolved}
            color="text-amber-600"
            bgColor="bg-amber-100"
          />
          <AlertStatCard 
            icon={XCircle}
            title="严重警报"
            value={stats.error}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <AlertStatCard 
            icon={CheckCircle2}
            title="已处理"
            value={stats.total - stats.unresolved}
            color="text-green-600"
            bgColor="bg-green-100"
          />
        </div>

        {/* Filters & Search */}
        <div className="px-6 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="搜索警报..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="unresolved">待处理</TabsTrigger>
              <TabsTrigger value="resolved">已处理</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            {Object.entries(alertConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = categoryFilter.includes(key);
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "px-2",
                    isActive && "bg-green-50 border-green-300"
                  )}
                  onClick={() => toggleCategory(key)}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-green-600" : "text-gray-400")} />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Alert List */}
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>没有找到匹配的警报</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <AlertCard 
                  key={alert.id}
                  alert={alert}
                  onResolve={resolveAlert}
                  onSelect={setSelectedAlertId}
                  isSelected={selectedAlertId === alert.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      <div className="w-80 bg-white border-l border-gray-200">
        <AlertDetailPanel 
          alert={selectedAlert}
          onResolve={resolveAlert}
          onClose={() => setSelectedAlertId(null)}
        />
      </div>
    </div>
  );
}
