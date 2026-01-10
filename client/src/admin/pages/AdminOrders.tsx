import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrders() {
  const [page, setPage] = useState(1);

  const { data, refetch, isLoading } = trpc.admin.memberships.list.useQuery({
    page,
    pageSize: 10,
  });

  const setStatusMutation = trpc.admin.memberships.setStatus.useMutation();

  const handleSetStatus = async (orderId: number, status: "paid" | "cancelled") => {
    if (!confirm(`确定要将订单标记为 ${status === "paid" ? "已支付" : "已取消"} 吗？`)) return;
    try {
        await setStatusMutation.mutateAsync({ orderId, status });
        toast.success("操作成功");
        refetch();
    } catch (e: any) {
        toast.error("操作失败", { description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="订单管理" description="会员购买与支付流水" />

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>购买方案</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
                ) : data?.list.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">暂无订单</TableCell></TableRow>
                ) : (
                    data?.list.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.id}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{order.user?.name || "未知"}</span>
                                    <span className="text-xs text-muted-foreground">{order.user?.phone}</span>
                                </div>
                            </TableCell>
                            <TableCell className="capitalize">{order.plan}</TableCell>
                            <TableCell className="font-medium">¥ {order.price}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                            </TableCell>
                            <TableCell>
                                <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                {order.status === "pending" && (
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            title="标记为已支付"
                                            onClick={() => handleSetStatus(order.id, "paid")}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            title="取消订单"
                                            onClick={() => handleSetStatus(order.id, "cancelled")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

       {/* 分页 */}
       {data && data.totalPages > 1 && (
        <div className="flex justify-end gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
            >
                上一页
            </Button>
            <div className="flex items-center text-sm text-muted-foreground">
                第 {page} / {data.totalPages} 页
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
            >
                下一页
            </Button>
        </div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string | null }) {
    switch (status) {
        case "paid": return <Badge className="bg-green-500 hover:bg-green-600">已支付</Badge>;
        case "pending": return <Badge variant="secondary" className="text-amber-600 bg-amber-50 border-amber-200">待支付</Badge>;
        case "cancelled": return <Badge variant="outline" className="text-muted-foreground">已取消</Badge>;
        case "failed": return <Badge variant="destructive">支付失败</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}
