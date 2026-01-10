import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminMachines() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, refetch, isLoading } = trpc.admin.machines.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    status: statusFilter as any,
  });

  // Note: We need to implement a machine status toggle mutation in admin router if we want to force offline/ban machines
  // For now, we reuse the review endpoint if applicable or just display
  
  const handleSearch = () => {
    setPage(1);
    setSearch(inputValue);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="农机管理" description="查看平台所有二手机挂牌记录与状态" />

      {/* 筛选工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
         <div className="flex items-center gap-2">
            <Badge 
                variant={!statusFilter ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter(undefined)}
            >
                全部
            </Badge>
            <Badge 
                variant={statusFilter === "pending" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("pending")}
            >
                待审核
            </Badge>
            <Badge 
                variant={statusFilter === "approved" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("approved")}
            >
                已上架
            </Badge>
            <Badge 
                variant={statusFilter === "rejected" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("rejected")}
            >
                已驳回
            </Badge>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜索标题、品牌..."
                    className="pl-9"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
            </div>
            <Button onClick={handleSearch}>搜索</Button>
         </div>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>标题/机型</TableHead>
                    <TableHead>价格/位置</TableHead>
                    <TableHead>发布人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发布时间</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
                ) : data?.list.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">暂无数据</TableCell></TableRow>
                ) : (
                    data?.list.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">{item.brand} {item.model}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-amber-600 font-medium">¥ {item.price}</span>
                                    <span className="text-xs text-muted-foreground">{item.location}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>ID: {item.sellerUserId}</span>
                                    <span className="text-xs text-muted-foreground">{item.contactPhone}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <MachineStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.createdAt), "yyyy-MM-dd")}
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

function MachineStatusBadge({ status }: { status: string | null }) {
    switch (status) {
        case "approved": return <Badge className="bg-green-500 hover:bg-green-600">已上架</Badge>;
        case "pending": return <Badge variant="secondary" className="text-amber-600 bg-amber-50">待审核</Badge>;
        case "rejected": return <Badge variant="destructive">已驳回</Badge>;
        case "sold": return <Badge variant="outline">已售出</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}
