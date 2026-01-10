import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShoppingBag, Tractor, List, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"; // Removed XCircle unused
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils"; // Added import

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.dashboard.stats.useQuery();

  if (isLoading) {
    return (
        <div className="space-y-6">
            <SectionHeader title="仪表盘" description="系统运行状态概览" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
        </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <SectionHeader title="仪表盘" description="系统运行状态概览" />

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总用户数"
          value={stats.users.total}
          subValue={`今日新增 +${stats.users.todayNew}`}
          icon={Users}
          trend="up"
        />
        <StatsCard
          title="总收入 (预估)"
          value={`¥ ${stats.orders.totalAmount}`}
          subValue={`${stats.orders.paid} 笔支付成功`}
          icon={ShoppingBag}
          trend="neutral"
        />
        <StatsCard
          title="活跃作业需求"
          value={stats.jobs.open}
          subValue={`待审核: ${stats.jobs.pending}`}
          icon={List}
          trend="down"
        />
        <StatsCard
          title="农机挂牌"
          value={stats.machines.approved}
          subValue={`待审核: ${stats.machines.pending}`}
          icon={Tractor}
          trend="up"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户增长趋势 */}
        <Card>
            <CardHeader>
                <CardTitle>用户增长趋势 (近7天)</CardTitle>
                <CardDescription>每日新增注册用户数</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.registrationTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="新增用户" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* 待办事项 */}
        <Card>
            <CardHeader>
                <CardTitle>待办事项</CardTitle>
                <CardDescription>需要管理员立即处理的任务</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <TodoItem 
                    title="待审核实名认证" 
                    count={stats.users.pendingVerifications} 
                    href="/admin/reviews"
                    type={stats.users.pendingVerifications > 0 ? "warning" : "success"}
                />
                <TodoItem 
                    title="待审核二手机挂牌" 
                    count={stats.machines.pending} 
                    href="/admin/machines?status=pending"
                    type={stats.machines.pending > 0 ? "error" : "success"}
                />
                <TodoItem 
                    title="待审核作业需求" 
                    count={stats.jobs.pending} 
                    href="/admin/jobs?status=pending"
                    type={stats.jobs.pending > 0 ? "error" : "success"}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subValue, icon: Icon, trend }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                    {subValue}
                </p>
            </CardContent>
        </Card>
    )
}

function TodoItem({ title, count, href, type }: any) {
    const isGood = count === 0;
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = href}>
            <div className="flex items-center gap-3">
                {type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                {type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {type === 'success' || isGood ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : null}
                <span className="font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className={cn(
                    "text-sm font-bold", 
                    count > 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                    {count}
                </span>
            </div>
        </div>
    )
}
