import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Clock,
  Fuel,
  MapPin,
  Tractor,
  Calendar,
  BarChart3,
  Trash2,
} from "lucide-react";

export default function WorkLogs() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterMachineId, setFilterMachineId] = useState<string>("all");
  const [filterFieldId, setFilterFieldId] = useState<string>("all");

  // 表单状态
  const [formData, setFormData] = useState({
    machineId: "",
    fieldId: "",
    startTime: "",
    endTime: "",
    workArea: "",
    fuelConsumed: "",
    totalYield: "",
    avgYield: "",
    avgMoisture: "",
  });

  // 获取数据
  const { data: workLogs, refetch: refetchLogs } = trpc.workLogs.list.useQuery({
    machineId: filterMachineId !== "all" ? parseInt(filterMachineId) : undefined,
    fieldId: filterFieldId !== "all" ? parseInt(filterFieldId) : undefined,
    limit: 100,
  });
  const { data: machines } = trpc.machines.list.useQuery();
  const { data: fields } = trpc.fields.list.useQuery();
  const { data: stats } = trpc.workLogs.getStats.useQuery({
    machineId: filterMachineId !== "all" ? parseInt(filterMachineId) : undefined,
    fieldId: filterFieldId !== "all" ? parseInt(filterFieldId) : undefined,
  });

  const createMutation = trpc.workLogs.create.useMutation({
    onSuccess: () => {
      toast.success("作业记录创建成功");
      setIsAddOpen(false);
      resetForm();
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.workLogs.delete.useMutation({
    onSuccess: () => {
      toast.success("作业记录已删除");
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      machineId: "",
      fieldId: "",
      startTime: "",
      endTime: "",
      workArea: "",
      fuelConsumed: "",
      totalYield: "",
      avgYield: "",
      avgMoisture: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.machineId || !formData.fieldId || !formData.startTime) {
      toast.error("请填写必填字段");
      return;
    }

    createMutation.mutate({
      machineId: parseInt(formData.machineId),
      fieldId: parseInt(formData.fieldId),
      startTime: new Date(formData.startTime),
      endTime: formData.endTime ? new Date(formData.endTime) : undefined,
      workArea: formData.workArea ? parseFloat(formData.workArea) : undefined,
      fuelConsumed: formData.fuelConsumed ? parseFloat(formData.fuelConsumed) : undefined,
      totalYield: formData.totalYield ? parseFloat(formData.totalYield) : undefined,
      avgYield: formData.avgYield ? parseFloat(formData.avgYield) : undefined,
      avgMoisture: formData.avgMoisture ? parseFloat(formData.avgMoisture) : undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条作业记录吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const getMachineName = (machineId: number) => {
    const machine = machines?.find((m) => m.id === machineId);
    return machine?.name || `农机 #${machineId}`;
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-green-600" />
            作业日志
          </h1>
          <p className="text-muted-foreground mt-1">
            记录和查看农机作业详情，包括作业时长、亩数和油耗
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              添加记录
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>添加作业记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>农机 *</Label>
                  <Select
                    value={formData.machineId}
                    onValueChange={(v) => setFormData({ ...formData, machineId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择农机" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines?.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id.toString()}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>地块 *</Label>
                  <Select
                    value={formData.fieldId}
                    onValueChange={(v) => setFormData({ ...formData, fieldId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择地块" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields?.map((field) => (
                        <SelectItem key={field.id} value={field.id.toString()}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始时间 *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>作业面积 (亩)</Label>
                  <Input
                    type="number"
                    placeholder="例如：50"
                    value={formData.workArea}
                    onChange={(e) => setFormData({ ...formData, workArea: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>油耗 (升)</Label>
                  <Input
                    type="number"
                    placeholder="例如：120"
                    value={formData.fuelConsumed}
                    onChange={(e) => setFormData({ ...formData, fuelConsumed: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>总产量 (kg)</Label>
                  <Input
                    type="number"
                    placeholder="42500"
                    value={formData.totalYield}
                    onChange={(e) => setFormData({ ...formData, totalYield: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>亩产 (kg/亩)</Label>
                  <Input
                    type="number"
                    placeholder="850"
                    value={formData.avgYield}
                    onChange={(e) => setFormData({ ...formData, avgYield: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>水分 (%)</Label>
                  <Input
                    type="number"
                    placeholder="14.5"
                    value={formData.avgMoisture}
                    onChange={(e) => setFormData({ ...formData, avgMoisture: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">作业记录</p>
                <p className="text-2xl font-bold">{stats?.totalLogs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总作业面积</p>
                <p className="text-2xl font-bold">{stats?.totalWorkArea || 0} <span className="text-sm font-normal">亩</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总油耗</p>
                <p className="text-2xl font-bold">{stats?.totalFuelConsumed || 0} <span className="text-sm font-normal">升</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总作业时长</p>
                <p className="text-2xl font-bold">{stats?.totalWorkHours || 0} <span className="text-sm font-normal">小时</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label className="mb-2 block">按农机筛选</Label>
              <Select value={filterMachineId} onValueChange={setFilterMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部农机" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部农机</SelectItem>
                  {machines?.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id.toString()}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="mb-2 block">按地块筛选</Label>
              <Select value={filterFieldId} onValueChange={setFilterFieldId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部地块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部地块</SelectItem>
                  {fields?.map((field) => (
                    <SelectItem key={field.id} value={field.id.toString()}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 作业记录表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            作业记录列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>农机</TableHead>
                <TableHead>地块</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>作业时长</TableHead>
                <TableHead>作业面积</TableHead>
                <TableHead>油耗</TableHead>
                <TableHead>产量</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workLogs && workLogs.length > 0 ? (
                workLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tractor className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{getMachineName(log.machineId)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFieldName(log.fieldId)}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(log.startTime)}</TableCell>
                    <TableCell>{formatDuration(log.startTime, log.endTime)}</TableCell>
                    <TableCell>
                      {log.workArea ? `${log.workArea} 亩` : "-"}
                    </TableCell>
                    <TableCell>
                      {log.fuelConsumed ? `${log.fuelConsumed} L` : "-"}
                    </TableCell>
                    <TableCell>
                      {log.totalYield ? (
                        <span>
                          {log.totalYield} kg
                          {log.avgYield && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({log.avgYield} kg/亩)
                            </span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(log.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无作业记录，点击"添加记录"开始记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
