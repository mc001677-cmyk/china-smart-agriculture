import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye,
  Sprout,
  Ruler,
  Activity,
  Loader2,
} from "lucide-react";
import { useField, Field } from "@/contexts/FieldContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FieldFormData {
  name: string;
  cropType: string;
  area: string;
  centerLat: string;
  centerLng: string;
}

const initialFormData: FieldFormData = {
  name: "",
  cropType: "大豆",
  area: "",
  centerLat: "47.25",
  centerLng: "132.55",
};

export default function Fields() {
  const { fields, isLoading, createField, updateField, deleteField, setActiveFieldId } = useField();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [formData, setFormData] = useState<FieldFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter fields by search query
  const filteredFields = fields.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.crop.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name || !formData.area) {
      toast.error("请填写必填字段");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createField({
        name: formData.name,
        cropType: formData.cropType,
        area: parseFloat(formData.area),
        centerLat: parseFloat(formData.centerLat),
        centerLng: parseFloat(formData.centerLng),
      });
      toast.success("地块创建成功");
      setIsCreateOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      toast.error("创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingField || !formData.name || !formData.area) {
      toast.error("请填写必填字段");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateField(editingField.id, {
        name: formData.name,
        cropType: formData.cropType,
        area: parseFloat(formData.area),
      });
      toast.success("地块更新成功");
      setIsEditOpen(false);
      setEditingField(null);
      setFormData(initialFormData);
    } catch (error) {
      toast.error("更新失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (field: Field) => {
    if (!confirm(`确定要删除地块 "${field.name}" 吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      await deleteField(field.id);
      toast.success("地块已删除");
    } catch (error) {
      toast.error("删除失败，请重试");
    }
  };

  const openEditDialog = (field: Field) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      cropType: field.crop,
      area: field.area.toString(),
      centerLat: field.center[1].toString(),
      centerLng: field.center[0].toString(),
    });
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      working: "bg-green-100 text-green-700 border-green-200",
      idle: "bg-gray-100 text-gray-600 border-gray-200",
      completed: "bg-blue-100 text-blue-700 border-blue-200",
    };
    const labels = {
      working: "作业中",
      idle: "空闲",
      completed: "已完成",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getCropIcon = (crop: string) => {
    const colors: Record<string, string> = {
      大豆: "text-yellow-600 bg-yellow-100",
      玉米: "text-amber-600 bg-amber-100",
      水稻: "text-green-600 bg-green-100",
    };
    return (
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colors[crop] || "text-gray-600 bg-gray-100")}>
        <Sprout className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl m-4 overflow-hidden border border-white/20">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-gray-50">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            地块管理
          </h2>
          <p className="text-sm text-gray-500 mt-1 ml-13">
            共 {fields.length} 个地块，总面积 {fields.reduce((sum, f) => sum + f.area, 0).toLocaleString()} 亩
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> 新增地块
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>新增地块</DialogTitle>
              <DialogDescription>
                填写地块信息，创建新的地块记录
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">地块名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：建三江-04号地块"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crop">作物类型 *</Label>
                <Select
                  value={formData.cropType}
                  onValueChange={(v) => setFormData({ ...formData, cropType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择作物类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="大豆">大豆</SelectItem>
                    <SelectItem value="玉米">玉米</SelectItem>
                    <SelectItem value="水稻">水稻</SelectItem>
                    <SelectItem value="小麦">小麦</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="area">面积 (亩) *</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="例如：450"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lat">中心纬度</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    value={formData.centerLat}
                    onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lng">中心经度</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    value={formData.centerLng}
                    onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-gray-50/50 border-b border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索地块名称、作物类型..."
            className="pl-9 bg-white border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFields.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-12"></TableHead>
                <TableHead>地块名称</TableHead>
                <TableHead>作物类型</TableHead>
                <TableHead>面积</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>收割进度</TableHead>
                <TableHead>平均产量</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFields.map((field) => (
                <TableRow key={field.id} className="hover:bg-gray-50/50">
                  <TableCell>{getCropIcon(field.crop)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-800">{field.name}</p>
                      <p className="text-xs text-gray-400">
                        {field.center[1].toFixed(4)}, {field.center[0].toFixed(4)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {field.crop}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Ruler className="h-3.5 w-3.5" />
                      {field.area.toLocaleString()} 亩
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(field.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${field.harvestProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{field.harvestProgress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {field.avgYield ? (
                      <span className="text-gray-600">{field.avgYield} kg/亩</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setActiveFieldId(field.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(field)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(field)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-600">暂无地块数据</h3>
            <p className="text-sm mb-6">
              {searchQuery ? "没有找到匹配的地块" : "您可以点击右上角按钮添加新的地块"}
            </p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑地块</DialogTitle>
            <DialogDescription>
              修改地块信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">地块名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-crop">作物类型 *</Label>
              <Select
                value={formData.cropType}
                onValueChange={(v) => setFormData({ ...formData, cropType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="大豆">大豆</SelectItem>
                  <SelectItem value="玉米">玉米</SelectItem>
                  <SelectItem value="水稻">水稻</SelectItem>
                  <SelectItem value="小麦">小麦</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-area">面积 (亩) *</Label>
              <Input
                id="edit-area"
                type="number"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
