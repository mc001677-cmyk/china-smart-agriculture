import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tractor, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye,
  Fuel,
  Gauge,
  MapPin,
  Loader2,
  Power,
  PowerOff,
  Wrench,
} from "lucide-react";
import { useFleet, MachineData } from "@/contexts/FleetContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MachineFormData {
  name: string;
  type: "harvester" | "tractor" | "seeder" | "sprayer";
  model: string;
  licensePlate: string;
}

const initialFormData: MachineFormData = {
  name: "",
  type: "tractor",
  model: "",
  licensePlate: "",
};

export default function MachineManager() {
  const { fleet, isLoading, setActiveMachineId } = useFleet();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<MachineFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter machines by search query
  const filteredMachines = fleet.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("请填写农机名称");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Mock creation for now as context doesn't support it yet
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("演示模式下暂不支持添加农机");
      setIsCreateOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      toast.error("添加失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (machine: MachineData, newStatus: "online" | "offline" | "maintenance") => {
    try {
      // Mock update for now
      toast.success(`${machine.name} 状态更新功能开发中`);
    } catch (error) {
      toast.error("状态更新失败");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      working: "bg-green-100 text-green-700 border-green-200",
      idle: "bg-yellow-100 text-yellow-600 border-yellow-200",
      moving: "bg-blue-100 text-blue-700 border-blue-200",
      offline: "bg-gray-100 text-gray-500 border-gray-200",
      off: "bg-gray-100 text-gray-500 border-gray-200",
      power_on: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    const labels: Record<string, string> = {
      working: "作业中",
      idle: "待命",
      moving: "行驶中",
      offline: "离线",
      off: "关机",
      power_on: "启动中",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", styles[status] || styles.offline)}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const colors: Record<string, string> = {
      harvester: "text-green-600 bg-green-100",
      tractor: "text-blue-600 bg-blue-100",
      seeder: "text-amber-600 bg-amber-100",
      sprayer: "text-purple-600 bg-purple-100",
    };
    return (
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors[type] || "text-gray-600 bg-gray-100")}>
        <Tractor className="h-5 w-5" />
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      harvester: "收割机",
      tractor: "拖拉机",
      seeder: "播种机",
      sprayer: "喷药机",
    };
    return labels[type] || type;
  };

  // Stats
  const onlineCount = fleet.filter(m => m.status !== 'offline' && m.status !== 'off').length;
  const workingCount = fleet.filter(m => m.status === 'working').length;
  const avgFuel = fleet.length > 0 
    ? Math.round(fleet.reduce((sum, m) => sum + m.fuel, 0) / fleet.length) 
    : 0;

  return (
    <div className="h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl m-4 overflow-hidden border border-white/20">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-gray-50">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Tractor className="h-5 w-5 text-blue-600" />
            </div>
            农机管理
          </h2>
          <p className="text-sm text-gray-500 mt-1 ml-13">
            共 {fleet.length} 台农机，{onlineCount} 台在线，{workingCount} 台作业中
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> 添加农机
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加农机</DialogTitle>
              <DialogDescription>
                填写农机信息，添加新的农机设备
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">农机名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：S780 收割机 (3号)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">设备类型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as MachineFormData["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择设备类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harvester">收割机</SelectItem>
                    <SelectItem value="tractor">拖拉机</SelectItem>
                    <SelectItem value="seeder">播种机</SelectItem>
                    <SelectItem value="sprayer">喷药机</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">型号</Label>
                <Input
                  id="model"
                  placeholder="例如：John Deere S780"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plate">车牌/编号</Label>
                <Input
                  id="plate"
                  placeholder="例如：JDS780-2025-003"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50/50 border-b border-gray-100">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Power className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">在线设备</p>
              <p className="text-xl font-bold text-gray-800">{onlineCount} / {fleet.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Gauge className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">作业中</p>
              <p className="text-xl font-bold text-gray-800">{workingCount} 台</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Fuel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">平均油量</p>
              <p className="text-xl font-bold text-gray-800">{avgFuel}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">待维护</p>
              <p className="text-xl font-bold text-gray-800">0 台</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="p-4 flex items-center gap-4 bg-white">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索农机名称或编号..."
            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>农机信息</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>油量/尿素</TableHead>
              <TableHead>位置</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Tractor className="h-12 w-12 text-gray-300" />
                    <p>未找到相关农机</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((machine) => (
                <TableRow key={machine.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-medium text-gray-500">#{machine.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getTypeIcon(machine.type)}
                      <div>
                        <div className="font-bold text-gray-900">{machine.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{machine.serial}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                      {getTypeLabel(machine.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(machine.status)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Fuel className="h-3 w-3 text-gray-400" />
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", machine.fuel < 20 ? "bg-red-500" : "bg-blue-500")} 
                            style={{ width: `${machine.fuel}%` }} 
                          />
                        </div>
                        <span className="text-gray-600">{machine.fuel}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Droplets className="h-3 w-3 text-gray-400" />
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-300 rounded-full" style={{ width: `${machine.def}%` }} />
                        </div>
                        <span className="text-gray-600">{machine.def}%</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {machine.lat.toFixed(4)}, {machine.lng.toFixed(4)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setActiveMachineId(machine.id)}>
                          <Eye className="h-4 w-4 mr-2" /> 查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" /> 编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> 删除设备
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Droplets(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  )
}
