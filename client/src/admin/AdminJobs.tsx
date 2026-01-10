/**
 * Admin 作业需求管理页面
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
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
  MapPin,
  Phone,
  Calendar,
  Wheat,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = {
  open: { label: "进行中", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  pending: { label: "待处理", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  closed: { label: "已完成", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
};

export default function AdminJobs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.jobs.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: jobDetail, isLoading: detailLoading } = trpc.admin.jobs.detail.useQuery(
    { jobId: selectedJob?.id },
    { enabled: !!selectedJob?.id && showDetailDialog }
  );

  const setStatusMutation = trpc.admin.jobs.setStatus.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">作业需求管理</h1>
        <p className="text-slate-500 mt-1">查看和管理平台上的作业需求</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索地块名称、联系人..."
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
                <SelectItem value="open">进行中</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="closed">已完成</SelectItem>
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
                  <th className="text-left p-4 text-sm font-medium text-slate-500">地块/作物</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">面积</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">价格</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">联系人</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">发布时间</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : data?.list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">暂无数据</td>
                  </tr>
                ) : (
                  data?.list.map((job) => {
                    const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG];
                    return (
                      <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Wheat className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{job.fieldName}</p>
                              <p className="text-sm text-slate-500">{job.cropType} · {job.workType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{job.area} 亩</td>
                        <td className="p-4">
                          {job.priceType === "fixed" ? (
                            <span className="font-medium text-emerald-600">¥{job.fixedPrice}</span>
                          ) : (
                            <span className="text-slate-500">竞价</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-slate-800">{job.contactName}</p>
                            <p className="text-sm text-slate-500">{job.contactPhone}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(job.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedJob(job); setShowDetailDialog(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {job.status === "open" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600"
                                onClick={() => setStatusMutation.mutate({ jobId: job.id, status: "closed" })}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
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

      {/* 详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>作业需求详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : jobDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Wheat className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{jobDetail.fieldName}</h3>
                  <p className="text-slate-500">{jobDetail.cropType} · {jobDetail.workType}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">面积</p>
                  <p className="font-medium">{jobDetail.area} 亩</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">价格</p>
                  <p className="font-medium">{jobDetail.priceType === "fixed" ? `¥${jobDetail.fixedPrice}` : "竞价"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">联系人</p>
                  <p className="font-medium">{jobDetail.contactName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">电话</p>
                  <p className="font-medium">{jobDetail.contactPhone}</p>
                </div>
              </div>
              {jobDetail.description && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">描述</p>
                  <p className="text-slate-700">{jobDetail.description}</p>
                </div>
              )}
              {jobDetail.publisher && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">发布者信息</p>
                  <p className="text-slate-700">{jobDetail.publisher.name || jobDetail.publisher.phone}</p>
                  <p className="text-sm text-slate-500">会员等级: {jobDetail.publisher.membershipLevel}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
