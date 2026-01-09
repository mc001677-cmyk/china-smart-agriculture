import { useState, useEffect } from "react";
import { X, Activity, Gauge, Thermometer, Fuel, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Wheat, Droplets, Scale, Warehouse, Map as MapIcon, Clock, AreaChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFleet } from "@/contexts/FleetContext";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
// Removed direct import
import { useLanguage } from "@/contexts/LanguageContext";

// Animated number component for smooth transitions
const AnimatedValue = ({ value, decimals = 0 }: { value: number, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const step = (value - displayValue) * 0.1;
    if (Math.abs(value - displayValue) < 0.1) {
      setDisplayValue(value);
      return;
    }
    
    const timer = requestAnimationFrame(() => {
      setDisplayValue(prev => prev + step);
    });
    
    return () => cancelAnimationFrame(timer);
  }, [value, displayValue]);

  return <>{displayValue.toFixed(decimals)}</>;
};

export function RightPanel() {
  const { activeMachineId, fleet: machines, setActiveMachineId, selectedDate, setSelectedDate } = useFleet();
  const historyDate = new Date(selectedDate);
  const setHistoryDate = (date: Date) => setSelectedDate(date.toISOString().split('T')[0]);
  const isHistoryMode = selectedDate !== new Date().toISOString().split('T')[0];
  const [isOpen, setIsOpen] = useState(true);
  
  // Find the active machine
  const activeMachineRaw = machines.find(m => m.id === activeMachineId);
  const activeMachine = activeMachineRaw ? {
    ...activeMachineRaw,
    health: Math.round((activeMachineRaw.params.engineOilHealth + activeMachineRaw.params.hydraulicOilHealth + activeMachineRaw.params.filterHealth) / 3)
  } : undefined;

  // Auto-open panel when a machine is selected
  useEffect(() => {
    if (activeMachineId) {
      setIsOpen(true);
    }
  }, [activeMachineId]);

  // Listen for open-right-panel event
  useEffect(() => {
    const handleOpenPanel = () => setIsOpen(true);
    window.addEventListener('open-right-panel', handleOpenPanel);
    return () => window.removeEventListener('open-right-panel', handleOpenPanel);
  }, []);

  if (!activeMachine) return null;

  // Helper to get health status color
  const getHealthColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getHealthText = (score: number) => {
    if (score >= 90) return "良好";
    if (score >= 70) return "需关注";
    return "警告";
  };

  // Check if selected date is today (for history mode)
  const today = new Date();
  const isToday = !isHistoryMode || (
    historyDate.getDate() === today.getDate() &&
    historyDate.getMonth() === today.getMonth() &&
    historyDate.getFullYear() === today.getFullYear()
  );

  // Get history data if not today
  const { getDailyLog } = useFleet();
  const dailyLog = !isToday ? getDailyLog(activeMachine.id, selectedDate) : null;

  return (
    <div 
      className={cn(
        "fixed right-4 top-20 bottom-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 transition-all duration-500 ease-out z-20 flex flex-col overflow-hidden",
        isOpen ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-b from-white to-gray-50/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeMachine.id}
            </div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {activeMachine.name}
            </h2>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold border", 
              activeMachine.status === 'working' ? "bg-green-50 text-green-700 border-green-200" : 
              activeMachine.status === 'idle' ? "bg-yellow-50 text-yellow-700 border-yellow-200" : 
              "bg-gray-50 text-gray-600 border-gray-200"
            )}>
              {activeMachine.status === 'working' ? (activeMachine.type === 'harvester' ? '收割作业中' : '深松作业中') : 
               activeMachine.status === 'idle' ? '怠速' : '离线'}
            </span>
          </div>
          <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {activeMachine.serial} • 已连接
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 bg-gray-50/30 overflow-y-auto">
        <div className="p-5 space-y-4">
          
          {/* Date Selector for History Mode */}
          <div className="bg-white rounded-xl border border-gray-200 p-1 shadow-sm flex items-center justify-between mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
              onClick={() => {
                const prevDate = new Date(historyDate);
                prevDate.setDate(prevDate.getDate() - 1);
                setHistoryDate(prevDate);
              }}
            >
              <ChevronDown className="h-4 w-4 rotate-90 text-gray-500" />
            </Button>
            
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-gray-900">
                {historyDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {isToday ? "今日实时" : "历史回溯"}
              </span>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
              disabled={isToday}
              onClick={() => {
                const nextDate = new Date(historyDate);
                nextDate.setDate(nextDate.getDate() + 1);
                if (nextDate <= new Date()) {
                  setHistoryDate(nextDate);
                }
              }}
            >
              <ChevronDown className="h-4 w-4 -rotate-90 text-gray-500" />
            </Button>
          </div>

          <Accordion type="multiple" defaultValue={["realtime", "health", "stats"]} className="space-y-4">
            
            {/* Real-time / History Metrics */}
            <AccordionItem value="realtime" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Activity className="h-4 w-4 text-blue-500" />
                  {isToday ? "实时数据" : "历史运行汇总"}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                {isToday ? (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Gauge className="h-3.5 w-3.5 group-hover:text-green-600 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">发动机转速</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                          <AnimatedValue value={activeMachine.params.rpm} decimals={0} />
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">RPM</span>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Activity className="h-3.5 w-3.5 group-hover:text-blue-600 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">作业速度</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                          <AnimatedValue value={activeMachine.params.speed} decimals={1} />
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">km/h</span>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Thermometer className="h-3.5 w-3.5 group-hover:text-red-500 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">水温</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                          <AnimatedValue value={activeMachine.params.scrInTemp / 3.5} decimals={0} />
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">°C</span>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Fuel className="h-3.5 w-3.5 group-hover:text-amber-600 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">实时油耗</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                          <AnimatedValue value={activeMachine.params.fuelRate} decimals={1} />
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">L/h</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // History Metrics
                  dailyLog ? (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <AreaChart className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">作业面积</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-gray-900">{dailyLog.area}</span>
                          <span className="text-xs text-gray-500 font-medium">ac</span>
                        </div>
                      </div>
                      <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">作业时长</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-gray-900">{dailyLog.duration}</span>
                        </div>
                      </div>
                      <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Scale className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">总产量</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-gray-900">{(dailyLog.yield / 1000).toFixed(1)}</span>
                          <span className="text-xs text-gray-500 font-medium">吨</span>
                        </div>
                      </div>
                      <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Fuel className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">总油耗</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-gray-900">{dailyLog.fuelConsumption}</span>
                          <span className="text-xs text-gray-500 font-medium">L</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      该日期无作业数据
                    </div>
                  )
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 设备健康监测 Section - Collapsible (Only show for Today) */}
            {isToday && (
              <AccordionItem value="health" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <CheckCircle2 className={cn("h-4 w-4", activeMachine.health > 80 ? "text-green-500" : "text-amber-500")} />
                    健康监测
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="pt-1 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-medium">综合健康度</span>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded", 
                        activeMachine.health > 80 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {activeMachine.health} / 100
                      </span>
                    </div>
                    
                    {/* 发动机 Oil */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-gray-600 font-medium">发动机 Oil</span>
                        <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded", 
                          activeMachine.params.engineOilHealth > 80 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                        )}>
                          {activeMachine.params.engineOilHealth}% ({getHealthText(activeMachine.params.engineOilHealth)})
                        </span>
                      </div>
                      <Progress value={activeMachine.params.engineOilHealth} className="h-1.5 bg-gray-100" indicatorClassName={getHealthColor(activeMachine.params.engineOilHealth)} />
                    </div>

                    {/* 液压系统 Oil */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-gray-600 font-medium">液压系统 Oil</span>
                        <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded", 
                          activeMachine.params.hydraulicOilHealth > 80 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                        )}>
                          {activeMachine.params.hydraulicOilHealth}% ({getHealthText(activeMachine.params.hydraulicOilHealth)})
                        </span>
                      </div>
                      <Progress value={activeMachine.params.hydraulicOilHealth} className="h-1.5 bg-gray-100" indicatorClassName={getHealthColor(activeMachine.params.hydraulicOilHealth)} />
                    </div>

                    {/* 滤芯寿命 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-gray-600 font-medium">滤芯寿命</span>
                        <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded", 
                          activeMachine.params.filterHealth > 80 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                        )}>
                          {activeMachine.params.filterHealth}% ({getHealthText(activeMachine.params.filterHealth)})
                        </span>
                      </div>
                      <Progress value={activeMachine.params.filterHealth} className="h-1.5 bg-gray-100" indicatorClassName={getHealthColor(activeMachine.params.filterHealth)} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Harvest/Work Dashboard */}
            {(activeMachine.type === 'harvester' || activeMachine.type === 'tractor') && (
              <AccordionItem value="stats" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Wheat className="h-4 w-4 text-[#FFC107]" />
                    {isToday ? (activeMachine.type === 'harvester' ? "实时收获看板" : "实时作业看板") : "作业效率分析"}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="pt-2">
                    {isToday ? (
                      // Today's 实时数据
                      <>
                        {activeMachine.type === 'harvester' ? (
                          // Harvester Specific Metrics
                          <>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {/* Yield */}
                              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <div className="flex items-center gap-2 text-amber-700 mb-1">
                                  <Scale className="h-3.5 w-3.5" />
                                  <span className="text-xs font-bold">实时产量</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xl font-bold text-gray-900 tabular-nums">
                                    <AnimatedValue value={activeMachine.yield || 0} decimals={0} />
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">kg/ac</span>
                                </div>
                              </div>
                              
                              {/* Moisture */}
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 mb-1">
                                  <Droplets className="h-3.5 w-3.5" />
                                  <span className="text-xs font-bold">谷物水分</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xl font-bold text-gray-900 tabular-nums">
                                    <AnimatedValue value={activeMachine.moisture || 0} decimals={1} />
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">%</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="flex items-center gap-2 text-green-700 mb-1">
                                <MapIcon className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">已作业面积</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-gray-900 tabular-nums">
                                  <AnimatedValue value={activeMachine.areaWorked || 0} decimals={1} />
                                </span>
                                <span className="text-xs text-gray-500 font-medium">ac</span>
                              </div>
                            </div>
                            
                            {/* Hitch Load */}
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                              <div className="flex items-center gap-2 text-purple-700 mb-1">
                                <Gauge className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">牵引负荷</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-gray-900 tabular-nums">
                                  <AnimatedValue value={activeMachine.load || 0} decimals={0} />
                                </span>
                                <span className="text-xs text-gray-500 font-medium">%</span>
                              </div>
                            </div>

                            {/* Grain Tank Level */}
                            <div className="mb-2">
                              <div className="flex justify-between text-xs items-center mb-2">
                                <div className="flex items-center gap-2 text-gray-600 font-bold">
                                  <Warehouse className="h-3.5 w-3.5" />
                                  粮仓装载率
                                </div>
                                <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded", 
                                  (activeMachine.grainTank || 0) > 90 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                                )}>
                                  {(activeMachine.grainTank || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200 relative">
                                <div 
                                  className={cn("h-full transition-all duration-500", 
                                    (activeMachine.grainTank || 0) > 90 ? "bg-red-500" : "bg-[#FFC107]"
                                  )}
                                  style={{ width: `${(activeMachine.grainTank || 0).toFixed(1)}%` }}
                                />
                                {/* Ticks */}
                                <div className="absolute inset-0 flex justify-between px-2">
                                  <div className="w-px h-full bg-white/50" />
                                  <div className="w-px h-full bg-white/50" />
                                  <div className="w-px h-full bg-white/50" />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Tractor Specific Metrics
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            {/* 已作业面积 */}
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <div className="flex items-center gap-2 text-green-700 mb-1">
                                <MapIcon className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">已作业面积</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-gray-900 tabular-nums">
                                  <AnimatedValue value={activeMachine.areaWorked || 0} decimals={1} />
                                </span>
                                <span className="text-xs text-gray-500 font-medium">ac</span>
                              </div>
                            </div>
                            
                            {/* Hitch Load */}
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 text-purple-700 mb-1">
                                <Gauge className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">牵引负荷</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-gray-900 tabular-nums">
                                  <AnimatedValue value={activeMachine.load || 0} decimals={0} />
                                </span>
                                <span className="text-xs text-gray-500 font-medium">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // History Efficiency Data
                      dailyLog ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">平均速度</div>
                            <div className="font-bold text-gray-900">{dailyLog.avgSpeed} km/h</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">平均油耗</div>
                            <div className="font-bold text-gray-900">{dailyLog.fuelConsumption} L/h</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">作业效率</div>
                            <div className="font-bold text-gray-900">{dailyLog.efficiency} ac/h</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">总油耗</div>
                            <div className="font-bold text-gray-900">{dailyLog.fuelConsumption} L</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          暂无历史数据
                        </div>
                      )
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full text-xs font-bold h-9 bg-white hover:bg-gray-50">
            <Clock className="h-3.5 w-3.5 mr-2 text-gray-500" />
            维护保养
          </Button>
          <Button className="w-full text-xs font-bold h-9 bg-[#2E7D32] hover:bg-[#1B5E20] text-white shadow-sm shadow-green-200">
            <MapIcon className="h-3.5 w-3.5 mr-2" />
            查看历史轨迹
          </Button>
        </div>
      </div>
    </div>
  );
}
