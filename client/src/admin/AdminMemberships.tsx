/**
 * Admin 会员订单管理页面
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Crown,
  Gem,
  Sparkles,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "待支付", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  paid: { label: "已支付", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled: { label: "已取消", icon: XCircle, color: "text-slate-500", bg: "bg-slate-100" },
  failed: { label: "支付失败", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
};

const PLAN_CONFIG = {
  silver: { label: "白银会员", icon: Crown, color: "text-slate-400", price: 66 },
  gold: { label: "黄金会员", icon: Gem, color: "text-amber-500", price: 199 },
  diamond: { label: "钻石伙伴", icon: Sparkles, color: "text-violet-500", price: null },
  device_bundle: { label: "设备捆绑", icon: CreditCard, color: "text-blue-500", price: null },
};

export default function AdminMemberships() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "paid" as "paid" | "cancelled", note: "" });

  const { data, isLoading, refetch } = trpc.admin.memberships.list.useQuery({
    page,
    pageSize: 20,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const setStatusMutation = trpc.admin.memberships.setStatus.useMutation({
    onSuccess: () => {
      toast.success("订单状态已更新");
      refetch();
      setShowStatusDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const openStatusDialog = (order: any, status: "paid" | "cancelled") => {
    setSelectedOrder(order);
    setStatusForm({ status, note: "" });
    setShowStatusDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">会员订单管理</h1>
        <p className="text-slate-500 mt-1">管理会员购买订单和支付状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">待支付</p>
                <p className="text-xl font-bold text-slate-800">{data?.list.filter(o => o.status === "pending").length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">已支付</p>
                <p className="text-xl font-bold text-slate-800">{data?.list.filter(o => o.status === "paid").length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">总收入</p>
                <p className="text-xl font-bold text-emerald-600">
                  ¥{data?.list.filter(o => o.status === "paid").reduce((sum, o) => sum + Number(o.price), 0).toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">总订单</p>
                <p className="text-xl font-bold text-slate-800">{data?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待支付</SelectItem>
                <SelectItem value="paid">已支付</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
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
                  <th className="text-left p-4 text-sm font-medium text-slate-500">订单号</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">用户</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">套餐</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">金额</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">创建时间</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : data?.list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">暂无订单数据</td>
                  </tr>
                ) : (
                  data?.list.map((order) => {
                    const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                    const plan = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
                    return (
                      <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-sm text-slate-600">#{order.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{order.user?.name || order.user?.phone || "未知用户"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {plan && <plan.icon className={cn("w-4 h-4", plan.color)} />}
                            <span className="text-slate-700">{plan?.label || order.plan}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-emerald-600">¥{Number(order.price).toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600"
                                  onClick={() => openStatusDialog(order, "paid")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500"
                                  onClick={() => openStatusDialog(order, "cancelled")}
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

      {/* 状态修改弹窗 */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusForm.status === "paid" ? "确认支付" : "取消订单"}</DialogTitle>
            <DialogDescription>
              {statusForm.status === "paid" 
                ? "确认后将为用户开通对应会员权益"
                : "确认取消该订单"}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="p-4 bg-slate-50 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">订单号 #{selectedOrder.id}</p>
                  <p className="font-medium">{PLAN_CONFIG[selectedOrder.plan as keyof typeof PLAN_CONFIG]?.label}</p>
                </div>
                <p className="text-xl font-bold text-emerald-600">¥{Number(selectedOrder.price).toLocaleString()}</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">备注</label>
            <Textarea
              value={statusForm.note}
              onChange={(e) => setStatusForm(f => ({ ...f, note: e.target.value }))}
              placeholder="可选备注"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>取消</Button>
            <Button
              variant={statusForm.status === "paid" ? "default" : "destructive"}
              onClick={() => setStatusMutation.mutate({
                orderId: selectedOrder.id,
                status: statusForm.status,
                note: statusForm.note || undefined,
              })}
              disabled={setStatusMutation.isPending}
            >
              确认{statusForm.status === "paid" ? "支付" : "取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
