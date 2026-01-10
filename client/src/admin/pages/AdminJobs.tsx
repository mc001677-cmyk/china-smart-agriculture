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
import { Search, MoreHorizontal, Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

export default function AdminJobs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, refetch, isLoading } = trpc.admin.jobs.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    status: statusFilter as any,
  });

  const setStatusMutation = trpc.admin.jobs.setStatus.useMutation();

  const handleSearch = () => {
    setPage(1);
    setSearch(inputValue);
  };

  const handleStatusChange = async (jobId: number, status: string) => {
    try {
        await setStatusMutation.mutateAsync({ jobId, status: status as any });
        toast.success("状态已更新");
        refetch();
    } catch (e: any) {
        toast.error("操作失败", { description: e.message });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="作业需求管理" description="管理全平台的作业订单与状态" />

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
                variant={statusFilter === "open" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("open")}
            >
                开放中
            </Badge>
            <Badge 
                variant={statusFilter === "closed" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("closed")}
            >
                已关闭
            </Badge>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜索作业、联系人..."
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
                    <TableHead>作业类型/作物</TableHead>
                    <TableHead>面积/单价</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发布时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
                ) : data?.list.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">暂无数据</TableCell></TableRow>
                ) : (
                    data?.list.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{item.workType}</span>
                                    <span className="text-xs text-muted-foreground">{item.fieldName} ({item.cropType})</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{item.area} 亩</span>
                                    <span className="text-xs text-muted-foreground">
                                        {item.priceType === 'fixed' ? `¥${item.fixedPrice}/亩` : '竞价'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{item.contactName}</span>
                                    <span className="text-xs text-muted-foreground">{item.contactPhone}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <JobStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.createdAt), "yyyy-MM-dd")}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">打开菜单</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {item.status === 'open' ? (
                                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "closed")}>
                                                <Ban className="mr-2 h-4 w-4" /> 关闭需求
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "open")}>
                                                <RotateCcw className="mr-2 h-4 w-4" /> 重新开放
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
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

function JobStatusBadge({ status }: { status: string | null }) {
    switch (status) {
        case "open": return <Badge className="bg-green-500 hover:bg-green-600">开放中</Badge>;
        case "closed": return <Badge variant="outline">已关闭</Badge>;
        case "completed": return <Badge variant="secondary">已完成</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}
