import { useState, useMemo } from "react";
import { useFleet } from "@/contexts/FleetContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wrench, Calendar, Clock, DollarSign, AlertTriangle,
  Plus, Search, TrendingUp, Heart, Settings,
  CheckCircle2, ChevronRight, FileText, Gauge,
  Zap, BarChart3, PenTool
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// 保养类型配置
const maintenanceTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  routine: { label: "常规保养", color: "bg-blue-100 text-blue-700", icon: Settings },
  repair: { label: "维修", color: "bg-red-100 text-red-700", icon: Wrench },
  inspection: { label: "检查", color: "bg-green-100 text-green-700", icon: Search },
  parts_replace: { label: "配件更换", color: "bg-amber-100 text-amber-700", icon: Zap },
};

// 保养计划类型配置
const planTypeConfig: Record<string, { label: string; interval: number; cost: number }> = {
  oil_change: { label: "换机油", interval: 250, cost: 800 },
  filter_replace: { label: "更换滤芯", interval: 500, cost: 600 },
  belt_check: { label: "皮带检查", interval: 1000, cost: 300 },
  brake_service: { label: "制动系统保养", interval: 1500, cost: 1500 },
  hydraulic_service: { label: "液压系统保养", interval: 2000, cost: 2000 },
  engine_overhaul: { label: "发动机大修", interval: 5000, cost: 15000 },
  general_service: { label: "综合保养", interval: 500, cost: 1200 },
};

// 紧急程度配置
const urgencyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  overdue: { label: "已逾期", color: "text-red-700", bgColor: "bg-red-100" },
  urgent: { label: "紧急", color: "text-orange-700", bgColor: "bg-orange-100" },
  high: { label: "较高", color: "text-amber-700", bgColor: "bg-amber-100" },
  medium: { label: "中等", color: "text-blue-700", bgColor: "bg-blue-100" },
  low: { label: "正常", color: "text-green-700", bgColor: "bg-green-100" },
};

// 模拟保养记录数据
const mockMaintenanceLogs = [
  {
    id: 1,
    machineId: 1,
    machineName: "约翰迪尔 S770",
    maintenanceType: "routine",
    maintenanceDate: new Date("2025-12-15"),
    engineHoursAtMaintenance: 1250,
    description: "定期保养，更换机油和滤芯",
    partsReplaced: JSON.stringify([
      { name: "机油", quantity: 12, unit: "升" },
      { name: "机油滤芯", quantity: 1, unit: "个" },
      { name: "空气滤芯", quantity: 1, unit: "个" },
    ]),
    laborCost: 500,
    partsCost: 1200,
    totalCost: 1700,
    technician: "张师傅",
    notes: "设备状态良好，建议下次保养时检查皮带磨损情况",
  },
  {
    id: 2,
    machineId: 2,
    machineName: "凯斯 7130",
    maintenanceType: "repair",
    maintenanceDate: new Date("2025-12-10"),
    engineHoursAtMaintenance: 980,
    description: "液压系统漏油维修",
    partsReplaced: JSON.stringify([
      { name: "液压油封", quantity: 2, unit: "套" },
      { name: "液压油", quantity: 20, unit: "升" },
    ]),
    laborCost: 800,
    partsCost: 2500,
    totalCost: 3300,
    technician: "李师傅",
    notes: "已修复漏油问题，建议定期检查液压系统",
  },
  {
    id: 3,
    machineId: 3,
    machineName: "约翰迪尔 7M-2204",
    maintenanceType: "inspection",
    maintenanceDate: new Date("2025-12-20"),
    engineHoursAtMaintenance: 2100,
    description: "季度全面检查",
    partsReplaced: null,
    laborCost: 300,
    partsCost: 0,
    totalCost: 300,
    technician: "王师傅",
    notes: "各系统运行正常，无需更换配件",
  },
  {
    id: 4,
    machineId: 1,
    machineName: "约翰迪尔 S770",
    maintenanceType: "parts_replace",
    maintenanceDate: new Date("2025-11-20"),
    engineHoursAtMaintenance: 1100,
    description: "更换收割机割台皮带",
    partsReplaced: JSON.stringify([
      { name: "割台传动皮带", quantity: 2, unit: "条" },
    ]),
    laborCost: 400,
    partsCost: 1800,
    totalCost: 2200,
    technician: "张师傅",
    notes: "皮带磨损严重，已全部更换",
  },
];

// 模拟保养预测数据
const mockPredictions = [
  {
    machineId: 1,
    machineName: "约翰迪尔 S770",
    planType: "oil_change",
    planTypeName: "换机油",
    currentHours: 1450,
    nextServiceHours: 1500,
    remainingHours: 50,
    predictedDate: "2026-01-08",
    urgency: "urgent",
    estimatedCost: 800,
  },
  {
    machineId: 1,
    machineName: "约翰迪尔 S770",
    planType: "filter_replace",
    planTypeName: "更换滤芯",
    currentHours: 1450,
    nextServiceHours: 1750,
    remainingHours: 300,
    predictedDate: "2026-02-15",
    urgency: "medium",
    estimatedCost: 600,
  },
  {
    machineId: 2,
    machineName: "凯斯 7130",
    planType: "general_service",
    planTypeName: "综合保养",
    currentHours: 1020,
    nextServiceHours: 1000,
    remainingHours: -20,
    predictedDate: "2025-12-28",
    urgency: "overdue",
    estimatedCost: 1200,
  },
  {
    machineId: 3,
    machineName: "约翰迪尔 7M-2204",
    planType: "hydraulic_service",
    planTypeName: "液压系统保养",
    currentHours: 2100,
    nextServiceHours: 2200,
    remainingHours: 100,
    predictedDate: "2026-01-15",
    urgency: "high",
    estimatedCost: 2000,
  },
  {
    machineId: 4,
    machineName: "凯斯 Puma 2104 (A)",
    planType: "belt_check",
    planTypeName: "皮带检查",
    currentHours: 850,
    nextServiceHours: 1000,
    remainingHours: 150,
    predictedDate: "2026-01-25",
    urgency: "medium",
    estimatedCost: 300,
  },
];

// 健康评分卡片
const HealthScoreCard = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };
  
  const getScoreLabel = (s: number) => {
    if (s >= 80) return "良好";
    if (s >= 60) return "一般";
    return "需关注";
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">车队健康评分</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", getScoreColor(score))}>{score}</span>
              <span className="text-gray-400">/100</span>
            </div>
            <Badge variant="outline" className={cn("mt-2", getScoreColor(score))}>
              {getScoreLabel(score)}
            </Badge>
          </div>
          <div className={cn("p-4 rounded-full", score >= 80 ? "bg-green-100" : score >= 60 ? "bg-amber-100" : "bg-red-100")}>
            <Heart className={cn("w-8 h-8", getScoreColor(score))} />
          </div>
        </div>
        <Progress value={score} className="mt-4 h-2" />
      </CardContent>
    </Card>
  );
};

// 统计卡片
const StatCard = ({ icon: Icon, title, value, unit, color, subtext }: {
  icon: any;
  title: string;
  value: number | string;
  unit?: string;
  color: string;
  subtext?: string;
}) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-base font-medium text-gray-500 ml-1">{unit}</span>}
        </p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    </CardContent>
  </Card>
);

// 保养记录卡片
const MaintenanceLogCard = ({ log, onClick }: { log: typeof mockMaintenanceLogs[0]; onClick: () => void }) => {
  const config = maintenanceTypeConfig[log.maintenanceType];
  const Icon = config.icon;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all border-l-4"
      style={{ borderLeftColor: log.maintenanceType === "repair" ? "#ef4444" : "#3b82f6" }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.color.split(" ")[0])}>
            <Icon className={cn("w-5 h-5", config.color.split(" ")[1])} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{log.machineName}</h3>
              <Badge variant="outline" className={cn("text-xs", config.color)}>
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{log.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(log.maintenanceDate, "yyyy-MM-dd")}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {log.engineHoursAtMaintenance}h
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ¥{log.totalCost.toLocaleString()}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
};

// 保养预测卡片
const PredictionCard = ({ prediction }: { prediction: typeof mockPredictions[0] }) => {
  const urgency = urgencyConfig[prediction.urgency];
  const progressValue = Math.max(0, Math.min(100, ((prediction.nextServiceHours - prediction.remainingHours) / prediction.nextServiceHours) * 100));
  
  return (
    <Card className={cn(
      "border-l-4 hover:shadow-md transition-all",
      prediction.urgency === "overdue" ? "border-l-red-500" :
      prediction.urgency === "urgent" ? "border-l-orange-500" :
      prediction.urgency === "high" ? "border-l-amber-500" :
      "border-l-blue-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{prediction.machineName}</h3>
            <p className="text-sm text-gray-500">{prediction.planTypeName}</p>
          </div>
          <Badge className={cn("text-xs", urgency.bgColor, urgency.color)}>
            {urgency.label}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">当前工时</span>
            <span className="font-medium">{prediction.currentHours}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">下次保养</span>
            <span className="font-medium">{prediction.nextServiceHours}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">剩余工时</span>
            <span className={cn("font-medium", prediction.remainingHours <= 0 ? "text-red-600" : "text-gray-900")}>
              {prediction.remainingHours}h
            </span>
          </div>
          <Progress value={progressValue} className="h-2 mt-2" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>预计日期: {prediction.predictedDate}</span>
            <span>预估费用: ¥{prediction.estimatedCost}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 添加保养记录对话框
const AddMaintenanceDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { fleet } = useFleet();
  const [formData, setFormData] = useState({
    machineId: "",
    maintenanceType: "routine",
    maintenanceDate: format(new Date(), "yyyy-MM-dd"),
    engineHours: "",
    description: "",
    laborCost: "",
    partsCost: "",
    technician: "",
    notes: "",
  });

  const handleSubmit = () => {
    console.log("提交保养记录:", formData);
    // 这里可以调用API保存数据
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            添加保养记录
          </DialogTitle>
          <DialogDescription>
            记录设备的保养、维修或检查信息
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>选择设备 *</Label>
              <Select value={formData.machineId} onValueChange={(v) => setFormData({...formData, machineId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="选择农机设备" />
                </SelectTrigger>
                <SelectContent>
                  {fleet.map(machine => (
                    <SelectItem key={machine.id} value={machine.id.toString()}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>保养类型 *</Label>
              <Select value={formData.maintenanceType} onValueChange={(v) => setFormData({...formData, maintenanceType: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(maintenanceTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>保养日期 *</Label>
              <Input 
                type="date" 
                value={formData.maintenanceDate}
                onChange={(e) => setFormData({...formData, maintenanceDate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>当前发动机工时</Label>
              <Input 
                type="number" 
                placeholder="例如: 1250"
                value={formData.engineHours}
                onChange={(e) => setFormData({...formData, engineHours: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>保养描述</Label>
            <Textarea 
              placeholder="描述本次保养的主要内容..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>人工费用 (元)</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={formData.laborCost}
                onChange={(e) => setFormData({...formData, laborCost: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>配件费用 (元)</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={formData.partsCost}
                onChange={(e) => setFormData({...formData, partsCost: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>维修技师</Label>
              <Input 
                placeholder="技师姓名"
                value={formData.technician}
                onChange={(e) => setFormData({...formData, technician: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea 
              placeholder="其他需要记录的信息..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit}>保存记录</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 保养记录详情对话框
const MaintenanceDetailDialog = ({ log, open, onOpenChange }: { 
  log: typeof mockMaintenanceLogs[0] | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) => {
  if (!log) return null;
  
  const config = maintenanceTypeConfig[log.maintenanceType];
  const parts = log.partsReplaced ? JSON.parse(log.partsReplaced) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            保养记录详情
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 基本信息 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{log.machineName}</h3>
                  <Badge className={cn("mt-1", config.color)}>{config.label}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">¥{log.totalCost.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">总费用</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">保养日期</span>
                  <span className="font-medium">{format(log.maintenanceDate, "yyyy-MM-dd")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">发动机工时</span>
                  <span className="font-medium">{log.engineHoursAtMaintenance}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">人工费用</span>
                  <span className="font-medium">¥{log.laborCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">配件费用</span>
                  <span className="font-medium">¥{log.partsCost}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-500">维修技师</span>
                  <span className="font-medium">{log.technician}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 保养描述 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">保养描述</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{log.description}</p>
            </CardContent>
          </Card>
          
          {/* 更换配件 */}
          {parts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">更换配件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parts.map((part: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700">{part.name}</span>
                      <span className="font-medium">{part.quantity} {part.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 备注 */}
          {log.notes && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  备注
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800">{log.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 添加保养计划对话框
const AddPlanDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { fleet } = useFleet();
  const [formData, setFormData] = useState({
    machineId: "",
    planType: "oil_change",
    intervalHours: "250",
    lastServiceHours: "",
    estimatedCost: "",
    notes: "",
  });

  const handleSubmit = () => {
    console.log("提交保养计划:", formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            添加保养计划
          </DialogTitle>
          <DialogDescription>
            为设备设置定期保养计划，系统将自动预测下次保养时间
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>选择设备 *</Label>
            <Select value={formData.machineId} onValueChange={(v) => setFormData({...formData, machineId: v})}>
              <SelectTrigger>
                <SelectValue placeholder="选择农机设备" />
              </SelectTrigger>
              <SelectContent>
                {fleet.map(machine => (
                  <SelectItem key={machine.id} value={machine.id.toString()}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>保养项目 *</Label>
            <Select value={formData.planType} onValueChange={(v) => {
              const config = planTypeConfig[v];
              setFormData({
                ...formData, 
                planType: v,
                intervalHours: config.interval.toString(),
                estimatedCost: config.cost.toString(),
              });
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(planTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} (每{config.interval}小时)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>保养间隔 (小时)</Label>
              <Input 
                type="number" 
                value={formData.intervalHours}
                onChange={(e) => setFormData({...formData, intervalHours: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>上次保养工时</Label>
              <Input 
                type="number" 
                placeholder="例如: 1000"
                value={formData.lastServiceHours}
                onChange={(e) => setFormData({...formData, lastServiceHours: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>预估费用 (元)</Label>
            <Input 
              type="number" 
              value={formData.estimatedCost}
              onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea 
              placeholder="其他需要说明的信息..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit}>创建计划</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 主页面组件
export default function Maintenance() {
  const { fleet } = useFleet();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [addLogDialogOpen, setAddLogDialogOpen] = useState(false);
  const [addPlanDialogOpen, setAddPlanDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<typeof mockMaintenanceLogs[0] | null>(null);

  // 计算统计数据
  const stats = useMemo(() => {
    const totalCost = mockMaintenanceLogs.reduce((sum, log) => sum + log.totalCost, 0);
    const overdueCount = mockPredictions.filter(p => p.urgency === "overdue").length;
    const urgentCount = mockPredictions.filter(p => p.urgency === "urgent" || p.urgency === "high").length;
    
    // 计算健康评分
    let healthScore = 100;
    mockPredictions.forEach(p => {
      if (p.urgency === "overdue") healthScore -= 25;
      else if (p.urgency === "urgent") healthScore -= 15;
      else if (p.urgency === "high") healthScore -= 10;
      else if (p.urgency === "medium") healthScore -= 5;
    });
    healthScore = Math.max(0, healthScore);
    
    return {
      totalLogs: mockMaintenanceLogs.length,
      totalCost,
      overdueCount,
      urgentCount,
      healthScore,
    };
  }, []);

  // 过滤保养记录
  const filteredLogs = useMemo(() => {
    return mockMaintenanceLogs.filter(log => {
      if (selectedMachine !== "all" && log.machineId.toString() !== selectedMachine) return false;
      if (searchQuery && !log.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [selectedMachine, searchQuery]);

  // 过滤预测
  const filteredPredictions = useMemo(() => {
    return mockPredictions.filter(p => {
      if (selectedMachine !== "all" && p.machineId.toString() !== selectedMachine) return false;
      return true;
    });
  }, [selectedMachine]);

  const handleLogClick = (log: typeof mockMaintenanceLogs[0]) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-7 h-7 text-blue-600" />
              设备保养管理
            </h1>
            <p className="text-gray-500 mt-1">管理设备保养台账，智能预测保养时间</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddPlanDialogOpen(true)}>
              <TrendingUp className="w-4 h-4 mr-2" />
              添加保养计划
            </Button>
            <Button onClick={() => setAddLogDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加保养记录
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <HealthScoreCard score={stats.healthScore} />
          <StatCard
            icon={FileText}
            title="保养记录总数"
            value={stats.totalLogs}
            unit="条"
            color="bg-blue-500"
          />
          <StatCard
            icon={DollarSign}
            title="累计保养费用"
            value={stats.totalCost}
            unit="元"
            color="bg-green-500"
          />
          <StatCard
            icon={AlertTriangle}
            title="逾期保养"
            value={stats.overdueCount}
            unit="项"
            color="bg-red-500"
            subtext="请立即安排保养"
          />
          <StatCard
            icon={Clock}
            title="即将到期"
            value={stats.urgentCount}
            unit="项"
            color="bg-amber-500"
            subtext="建议7天内完成"
          />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                概览
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                保养台账
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                智能预测
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择设备" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部设备</SelectItem>
                  {fleet.map(machine => (
                    <SelectItem key={machine.id} value={machine.id.toString()}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 最近保养记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    最近保养记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockMaintenanceLogs.slice(0, 4).map(log => (
                      <MaintenanceLogCard key={log.id} log={log} onClick={() => handleLogClick(log)} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 待处理保养 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    待处理保养
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockPredictions
                      .filter(p => p.urgency === "overdue" || p.urgency === "urgent" || p.urgency === "high")
                      .slice(0, 4)
                      .map((prediction, index) => (
                        <PredictionCard key={index} prediction={prediction} />
                      ))}
                    {mockPredictions.filter(p => p.urgency === "overdue" || p.urgency === "urgent" || p.urgency === "high").length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>暂无紧急保养任务</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 保养台账标签页 */}
          <TabsContent value="logs" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <CardTitle className="text-base">保养记录列表</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索保养记录..."
                        className="pl-9 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredLogs.map(log => (
                    <MaintenanceLogCard key={log.id} log={log} onClick={() => handleLogClick(log)} />
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>暂无保养记录</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 智能预测标签页 */}
          <TabsContent value="predictions" className="mt-6">
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">智能保养预测</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      系统根据设备当前发动机工时和保养计划，自动计算下次保养时间。
                      预测基于每日平均工作8小时的假设，实际日期可能因作业强度而有所变化。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPredictions.map((prediction, index) => (
                <PredictionCard key={index} prediction={prediction} />
              ))}
              {filteredPredictions.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无保养预测数据</p>
                  <p className="text-sm mt-2">请先添加保养计划</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 对话框 */}
      <AddMaintenanceDialog open={addLogDialogOpen} onOpenChange={setAddLogDialogOpen} />
      <AddPlanDialog open={addPlanDialogOpen} onOpenChange={setAddPlanDialogOpen} />
      <MaintenanceDetailDialog log={selectedLog} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} />
    </div>
  );
}
