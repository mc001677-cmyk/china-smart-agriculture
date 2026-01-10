/**
 * Admin 二手机管理页面
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  MapPin,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "待审核", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  approved: { label: "已通过", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  rejected: { label: "已拒绝", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
};

export default function AdminMachines() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: "approved" as "approved" | "rejected", note: "" });

  const { data, isLoading, refetch } = trpc.admin.machines.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const reviewMutation = trpc.admin.machines.review.useMutation({
    onSuccess: () => {
      toast.success("审核完成");
      refetch();
      setShowReviewDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const openReviewDialog = (machine: any, status: "approved" | "rejected") => {
    setSelectedMachine(machine);
    setReviewForm({ status, note: "" });
    setShowReviewDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">二手机管理</h1>
        <p className="text-slate-500 mt-1">审核和管理二手农机挂牌信息</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索标题、品牌..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-4 text-sm font-medium text-slate-500">农机信息</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">价格</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">位置</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">联系电话</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">发布时间</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="p-4"><Skeleton className="h-10 w-48" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-28" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : data?.list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">暂无数据</td>
                  </tr>
                ) : (
                  data?.list.map((machine) => {
                    const status = STATUS_CONFIG[machine.status as keyof typeof STATUS_CONFIG];
                    return (
                      <tr key={machine.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 max-w-[200px] truncate">{machine.title}</p>
                              <p className="text-sm text-slate-500">{machine.brand} {machine.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-emerald-600">¥{Number(machine.price).toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {machine.location || "未设置"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {machine.contactPhone}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(machine.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {machine.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600"
                                  onClick={() => openReviewDialog(machine, "approved")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => openReviewDialog(machine, "rejected")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 审核弹窗 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewForm.status === "approved" ? "通过审核" : "拒绝审核"}</DialogTitle>
            <DialogDescription>
              {reviewForm.status === "approved" 
                ? "确认通过后，该二手机将在平台上公开展示"
                : "请填写拒绝原因，以便卖家了解并修改"}
            </DialogDescription>
          </DialogHeader>
          {selectedMachine && (
            <div className="p-4 bg-slate-50 rounded-xl mb-4">
              <p className="font-medium">{selectedMachine.title}</p>
              <p className="text-sm text-slate-500">{selectedMachine.brand} {selectedMachine.model}</p>
              <p className="text-emerald-600 font-medium mt-1">¥{Number(selectedMachine.price).toLocaleString()}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">审核备注</label>
            <Textarea
              value={reviewForm.note}
              onChange={(e) => setReviewForm(f => ({ ...f, note: e.target.value }))}
              placeholder={reviewForm.status === "rejected" ? "请填写拒绝原因" : "可选备注"}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>取消</Button>
            <Button
              variant={reviewForm.status === "approved" ? "default" : "destructive"}
              onClick={() => reviewMutation.mutate({
                listingId: selectedMachine.id,
                status: reviewForm.status,
                note: reviewForm.note || undefined,
              })}
              disabled={reviewMutation.isPending}
            >
              确认{reviewForm.status === "approved" ? "通过" : "拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
