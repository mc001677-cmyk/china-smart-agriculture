import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Droplets, Gauge, Thermometer, Activity, Clock, MapPin, Fuel, Plus } from "lucide-react";
import { useFleet } from "@/contexts/FleetContext";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";

interface MachineDetailPanelProps {
  machineId: number;
  onClose: () => void;
}

// Custom Gauge Component using Recharts
const CircularGauge = ({ value, max = 100, color, label, subLabel }: { value: number, max?: number, color: string, label: string, subLabel: string }) => {
  const data = [{ value: value, fill: color }];
  
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white/40 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
      <div className="h-24 w-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={8} 
            data={data} 
            startAngle={90} 
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, max]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight text-gray-900">{value}</span>
          <span className="text-[10px] text-gray-500 uppercase font-medium">{subLabel}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 mt-1">{label}</span>
    </div>
  );
};

// Minimalist Data Card
const DataCard = ({ label, value, unit, icon: Icon }: { label: string, value: string, unit?: string, icon?: any }) => (
  <div className="flex flex-col p-3 bg-white/40 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm hover:bg-white/60 transition-colors">
    <div className="flex items-center gap-2 mb-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-semibold text-gray-900 tracking-tight">{value}</span>
      {unit && <span className="text-xs text-gray-500 font-medium">{unit}</span>}
    </div>
  </div>
);

export default function MachineDetailPanel({ machineId, onClose }: MachineDetailPanelProps) {
  const [location] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const { getMachineById } = useFleet();
  const machine = getMachineById(machineId);

  // 获取该农机的作业日志
  const { data: workLogs } = trpc.workLogs.list.useQuery({ machineId, limit: 10 });
  const { data: stats } = trpc.workLogs.getStats.useQuery({ machineId });
  const { data: fields } = trpc.fields.list.useQuery();

  const getFieldName = (fieldId: number) => {
    const field = fields?.find((f) => f.id === fieldId);
    return field?.name || `地块 #${fieldId}`;
  };

  const formatDuration = (startTime: Date | null, endTime: Date | null) => {
    if (!startTime || !endTime) return "-";
    const hours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    if (hours < 1) {
      return `${Math.round(hours * 60)} 分钟`;
    }
    return `${hours.toFixed(1)} 小时`;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!machine) return null;

  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-2xl border-l border-white/20 shadow-2xl animate-in slide-in-from-right duration-500">
      {/* Header - Apple Style: Large Title, Clean Actions */}
      <div className="pt-8 pb-4 px-6 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{machine.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 text-gray-600 border border-black/5">
              {machine.serial}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              machine.status === 'working' 
                ? 'bg-green-100/50 text-green-700 border-green-200/50' 
                : 'bg-gray-100/50 text-gray-600 border-gray-200/50'
            }`}>
              {machine.status === 'working' ? '作业中' : '怠速'}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 text-gray-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-2">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <div className="px-4 mb-4">
            <TabsList className="w-full bg-black/5 p-1 rounded-xl h-9">
              <TabsTrigger 
                value="overview" 
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
              >
                概览
              </TabsTrigger>
              <TabsTrigger 
                value="worklogs" 
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
              >
                作业日志
              </TabsTrigger>
              <TabsTrigger 
                value="engine" 
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
              >
                发动机
              </TabsTrigger>
              <TabsTrigger 
                value="harvest" 
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
                disabled={machine.type !== 'harvester'}
              >
                收获
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-4 pb-6">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Key Metrics - Gauges */}
              <div className="grid grid-cols-2 gap-3">
                <CircularGauge 
                  value={Math.round(machine.fuel)} 
                  color={machine.fuel < 20 ? "#ef4444" : "#3b82f6"} 
                  label="燃油液位" 
                  subLabel="%" 
                />
                <CircularGauge 
                  value={Math.round(machine.params.defLevel)} 
                  color="#8b5cf6" 
                  label="DEF液位" 
                  subLabel="%" 
                />
              </div>

              {/* Primary Stats */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">核心指标</h3>
                <div className="grid grid-cols-2 gap-3">
                  <DataCard label="发动机转速" value={Math.round(machine.params.rpm).toString()} unit="RPM" icon={Activity} />
                  <DataCard label="燃油消耗率" value={machine.params.fuelRate.toFixed(1)} unit="L/h" icon={Droplets} />
                  <DataCard label="环境温度" value={machine.params.airTemp.toString()} unit="°C" icon={Thermometer} />
                  <DataCard label="大气压力" value={machine.params.pressure.toFixed(0)} unit="kPa" icon={Gauge} />
                </div>
              </div>
            </TabsContent>

            {/* 作业日志标签页 */}
            <TabsContent value="worklogs" className="space-y-4 mt-0">
              {/* 统计摘要 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] uppercase tracking-wider text-blue-600 font-medium">总作业面积</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">{stats?.totalWorkArea || 0}</span>
                    <span className="text-xs text-gray-500">亩</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] uppercase tracking-wider text-orange-600 font-medium">总油耗</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">{stats?.totalFuelConsumed || 0}</span>
                    <span className="text-xs text-gray-500">升</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[10px] uppercase tracking-wider text-purple-600 font-medium">总作业时长</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">{stats?.totalWorkHours || 0}</span>
                    <span className="text-xs text-gray-500">小时</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] uppercase tracking-wider text-green-600 font-medium">作业记录</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">{stats?.totalLogs || 0}</span>
                    <span className="text-xs text-gray-500">条</span>
                  </div>
                </div>
              </div>

              {/* 最近作业记录 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">最近作业</h3>
                  <Link href={`${base}/worklogs`}>
                    <a className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      添加记录
                    </a>
                  </Link>
                </div>
                
                {workLogs && workLogs.length > 0 ? (
                  <div className="space-y-2">
                    {workLogs.slice(0, 5).map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3 bg-white/60 rounded-xl border border-white/40 hover:bg-white/80 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-[10px]">
                            {getFieldName(log.fieldId)}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(log.startTime)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">时长</span>
                            <p className="font-medium text-gray-700">{formatDuration(log.startTime, log.endTime)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">面积</span>
                            <p className="font-medium text-gray-700">{log.workArea ? `${log.workArea} 亩` : "-"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">油耗</span>
                            <p className="font-medium text-gray-700">{log.fuelConsumed ? `${log.fuelConsumed} L` : "-"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无作业记录</p>
                    <Link href={`${base}/worklogs`}>
                      <a className="text-green-600 hover:text-green-700 text-xs mt-1 inline-block">
                        前往添加
                      </a>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="engine" className="space-y-6 mt-0">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">后处理系统</h3>
                <div className="grid grid-cols-2 gap-3">
                  <DataCard label="DEF温度" value={machine.params.defTemp.toString()} unit="°C" />
                  <DataCard label="DEF压力" value={machine.params.defPressure.toFixed(0)} unit="kPa" />
                  <DataCard label="SCR入口温度" value={machine.params.scrInTemp.toFixed(0)} unit="°C" />
                  <DataCard label="SCR出口温度" value={machine.params.scrOutTemp.toFixed(0)} unit="°C" />
                  <DataCard label="DPF碳载量" value={machine.params.dpfSoot.toFixed(1)} unit="g" />
                  <DataCard label="DPF压差" value={machine.params.dpfDiffPressure.toFixed(1)} unit="kPa" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="harvest" className="space-y-6 mt-0">
              {machine.type === 'harvester' && (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-100 shadow-sm">
                      <div>
                        <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">实时产量</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900 tracking-tighter">{machine.yield}</span>
                          <span className="text-sm font-medium text-gray-600">kg/亩</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CircularGauge 
                      value={machine.grainTank || 0} 
                      color="#f59e0b" 
                      label="粮箱满载率" 
                      subLabel="%" 
                    />
                    <CircularGauge 
                      value={machine.moisture || 0} 
                      max={30}
                      color="#0ea5e9" 
                      label="作物水分" 
                      subLabel="%" 
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
