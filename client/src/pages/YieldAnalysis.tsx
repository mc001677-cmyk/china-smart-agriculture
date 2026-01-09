import { useState, useMemo } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, TrendingUp, TrendingDown, Wheat, Target, Fuel, 
  Clock, Calendar, Download, Filter, ArrowUpRight, ArrowDownRight,
  Tractor, Droplets, Zap, PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";

// 友谊农场车队机器名称映射
const machineNames: Record<number, string> = (() => {
  const names: Record<number, string> = {};
  // 约翰迪尔 S760 - 20台
  for (let i = 1; i <= 20; i++) {
    names[i] = `约翰迪尔 S760 #${String(i).padStart(2, '0')}`;
  }
  // 约翰迪尔 S770 - 15台
  for (let i = 21; i <= 35; i++) {
    names[i] = `约翰迪尔 S770 #${String(i - 20).padStart(2, '0')}`;
  }
  // 约翰迪尔 S780 - 10台
  for (let i = 36; i <= 45; i++) {
    names[i] = `约翰迪尔 S780 #${String(i - 35).padStart(2, '0')}`;
  }
  // 凯斯 8250 - 5台
  for (let i = 46; i <= 50; i++) {
    names[i] = `凯斯 8250 #${String(i - 45).padStart(2, '0')}`;
  }
  // 运粮车 JD-9R - 15台
  for (let i = 51; i <= 65; i++) {
    names[i] = `运粮车 JD-9R #${String(i - 50).padStart(2, '0')}`;
  }
  // 运粮车 CASE-M - 10台
  for (let i = 66; i <= 75; i++) {
    names[i] = `运粮车 CASE-M #${String(i - 65).padStart(2, '0')}`;
  }
  return names;
})();

// Stat card component
const StatCard = ({ icon: Icon, title, value, unit, change, changeLabel, color, large }: {
  icon: any;
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  changeLabel?: string;
  color: string;
  large?: boolean;
}) => (
  <Card className={cn("relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-0 card-hover", large && "col-span-2")}>
    <CardContent className={cn("p-5", large && "p-7")}>
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-xl shadow-sm", color)}>
          <Icon className={cn("text-white", large ? "w-6 h-6" : "w-5 h-5")} />
        </div>
        {change !== undefined && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              change >= 0 ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"
            )}
          >
            {change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(change)}%
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className={cn("font-bold text-gray-900 tracking-tight animate-count-up", large ? "text-4xl" : "text-3xl")}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className={cn("font-medium text-gray-500 ml-1.5", large ? "text-xl" : "text-base")}>{unit}</span>}
        </p>
        <p className={cn("text-gray-500 mt-2 font-medium", large ? "text-base" : "text-sm")}>{title}</p>
        {changeLabel && <p className="text-xs text-gray-400 mt-1">{changeLabel}</p>}
      </div>
    </CardContent>
  </Card>
);

// Simple bar chart component
const SimpleBarChart = ({ data, maxValue, color }: {
  data: { label: string; value: number }[];
  maxValue: number;
  color: string;
}) => (
  <div className="space-y-3">
    {data.map((item, index) => (
      <div key={index} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{item.label}</span>
          <span className="font-medium text-gray-900">{item.value.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${(item.value / maxValue) * 100}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

// Machine ranking card
const MachineRankingCard = ({ machineStats }: {
  machineStats: Record<number, { area: number; yield: number; fuel: number; hours: number }>;
}) => {
  const rankings = Object.entries(machineStats)
    .map(([id, stats]) => ({
      id: Number(id),
      name: machineNames[Number(id)] || `设备 ${id}`,
      ...stats,
      efficiency: stats.hours > 0 ? stats.area / stats.hours : 0
    }))
    // 过滤掉运粮车，只显示收割机的排名
    .filter(machine => !machine.name.includes('运粮车'))
    .sort((a, b) => b.area - a.area)
    .slice(0, 10); // 只显示前10名

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tractor className="w-5 h-5 text-blue-500" />
          设备作业排名
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rankings.map((machine, index) => (
            <div key={machine.id} className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                index === 0 ? "bg-amber-100 text-amber-700" :
                index === 1 ? "bg-gray-100 text-gray-600" :
                index === 2 ? "bg-orange-100 text-orange-700" :
                "bg-gray-50 text-gray-400"
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{machine.name}</p>
                <p className="text-xs text-gray-400">
                  效率: {machine.efficiency.toFixed(1)} 亩/h · 油耗: {machine.fuel} L
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{machine.area.toFixed(0)}</p>
                <p className="text-xs text-gray-400">亩</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Daily trend chart
const DailyTrendChart = ({ dailyStats }: {
  dailyStats: Record<string, { area: number; yield: number; fuel: number }>;
}) => {
  const sortedDays = Object.entries(dailyStats)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-10);

  const maxArea = Math.max(...sortedDays.map(([, s]) => s.area));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          每日作业趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-40">
          {sortedDays.map(([date, stats]) => {
            const height = (stats.area / maxArea) * 100;
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-gray-500 mb-1">{stats.area.toFixed(0)}</span>
                  <div 
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {format(new Date(date), 'MM/dd')}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Work type distribution
const WorkTypeDistribution = ({ logs }: { logs: any[] }) => {
  const distribution = logs.reduce((acc, log) => {
    acc[log.workType] = (acc[log.workType] || 0) + log.area;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(distribution).reduce((sum: number, v: any) => sum + v, 0);
  const colors: Record<string, string> = {
    "收割": "bg-amber-500",
    "深松": "bg-blue-500",
    "播种": "bg-green-500",
    "施肥": "bg-purple-500",
    "转场": "bg-gray-400"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          作业类型分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(distribution).map(([type, area]: [string, any]) => {
            const percentage = (area / total) * 100;
            return (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{type}</span>
                  <span className="font-medium text-gray-900">{area.toFixed(0)} 亩 ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", colors[type] || "bg-gray-400")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Recent logs table
const RecentLogsTable = ({ logs }: { logs: any[] }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        近期作业记录
      </CardTitle>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-1" />
        导出
      </Button>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 font-medium text-gray-500">日期</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">设备</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">类型</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">面积</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">产量</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">油耗</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">效率</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 10).map((log, index) => (
              <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3">{format(new Date(log.date), 'MM/dd')}</td>
                <td className="py-2 px-3 font-medium">{log.machineName}</td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className="text-xs">
                    {log.workType}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-right">{log.area} 亩</td>
                <td className="py-2 px-3 text-right">{log.yield > 0 ? `${(log.yield/1000).toFixed(1)}吨` : '-'}</td>
                <td className="py-2 px-3 text-right">{log.fuelConsumption} L</td>
                <td className="py-2 px-3 text-right">{log.efficiency} 亩/h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default function YieldAnalysis() {
  const { allLogs, yieldStats } = useFleet();
  const [timeRange, setTimeRange] = useState("10");

  // Filter logs by time range
  const filteredLogs = useMemo(() => {
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days);
    return allLogs.filter(log => new Date(log.date) >= startDate);
  }, [allLogs, timeRange]);

  // Calculate stats for filtered logs
  const stats = useMemo(() => {
    if (!yieldStats) return null;
    
    const totalArea = filteredLogs.reduce((sum, log) => sum + log.area, 0);
    const totalYield = filteredLogs.reduce((sum, log) => sum + log.yield, 0);
    const totalFuel = filteredLogs.reduce((sum, log) => sum + log.fuelConsumption, 0);
    const avgYield = totalArea > 0 ? totalYield / totalArea : 0;
    const avgEfficiency = filteredLogs.length > 0 
      ? filteredLogs.reduce((sum, log) => sum + log.efficiency, 0) / filteredLogs.length 
      : 0;

    // Daily breakdown
    const dailyStats: Record<string, { area: number; yield: number; fuel: number }> = {};
    filteredLogs.forEach(log => {
      if (!dailyStats[log.date]) {
        dailyStats[log.date] = { area: 0, yield: 0, fuel: 0 };
      }
      dailyStats[log.date].area += log.area;
      dailyStats[log.date].yield += log.yield;
      dailyStats[log.date].fuel += log.fuelConsumption;
    });

    // Machine breakdown
    const machineStats: Record<number, { area: number; yield: number; fuel: number; hours: number }> = {};
    filteredLogs.forEach(log => {
      if (!machineStats[log.machineId]) {
        machineStats[log.machineId] = { area: 0, yield: 0, fuel: 0, hours: 0 };
      }
      machineStats[log.machineId].area += log.area;
      machineStats[log.machineId].yield += log.yield;
      machineStats[log.machineId].fuel += log.fuelConsumption;
      const durationMatch = log.duration.match(/(\d+)h\s*(\d+)?m?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]) + (parseInt(durationMatch[2] || "0") / 60);
        machineStats[log.machineId].hours += hours;
      }
    });

    return {
      totalArea,
      totalYield,
      totalFuel,
      avgYield: Math.round(avgYield),
      avgEfficiency: Number(avgEfficiency.toFixed(1)),
      dailyStats,
      machineStats
    };
  }, [filteredLogs, yieldStats]);

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              亩产分析
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              车队作业数据统计与分析 · 共 {filteredLogs.length} 条作业记录
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">近3天</SelectItem>
                <SelectItem value="7">近7天</SelectItem>
                <SelectItem value="10">近10天</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard 
              icon={Target}
              title="总作业面积"
              value={stats.totalArea.toFixed(0)}
              unit="亩"
              change={8}
              changeLabel="较上周期"
              color="bg-green-500"
              large
            />
            <StatCard 
              icon={Wheat}
              title="总收获量"
              value={(stats.totalYield / 1000).toFixed(1)}
              unit="吨"
              change={12}
              color="bg-amber-500"
            />
            <StatCard 
              icon={Fuel}
              title="总燃油消耗"
              value={stats.totalFuel}
              unit="升"
              change={-3}
              color="bg-red-500"
            />
            <StatCard 
              icon={Droplets}
              title="平均亩产"
              value={stats.avgYield}
              unit="kg/亩"
              change={5}
              color="bg-blue-500"
            />
            <StatCard 
              icon={Zap}
              title="平均效率"
              value={stats.avgEfficiency}
              unit="亩/h"
              change={2}
              color="bg-purple-500"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">
            <DailyTrendChart dailyStats={stats.dailyStats} />
            <MachineRankingCard machineStats={stats.machineStats} />
            <WorkTypeDistribution logs={filteredLogs} />
          </div>

          {/* Recent Logs */}
          <RecentLogsTable logs={filteredLogs} />
        </div>
      </ScrollArea>
    </div>
  );
}
