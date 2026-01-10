/**
 * Admin Dashboard 总览看板
 * Apple 风格的数据可视化界面
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Briefcase, 
  Truck, 
  CreditCard, 
  TrendingUp,
  Crown,
  Star,
  Gem,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// 统计卡片组件
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  gradient,
  loading 
}: { 
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  gradient: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className={cn("w-4 h-4", trend >= 0 ? "text-emerald-500" : "text-red-500")} />
                <span className={cn("text-sm font-medium", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {trend >= 0 ? "+" : ""}{trend}%
                </span>
                {trendLabel && <span className="text-xs text-slate-400 ml-1">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", gradient)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 会员分布卡片
function MembershipDistribution({ data, loading }: { data?: Record<string, number>; loading?: boolean }) {
  const levels = [
    { key: "free", label: "免费用户", icon: Star, color: "text-slate-500", bg: "bg-slate-100" },
    { key: "silver", label: "白银会员", icon: Crown, color: "text-slate-400", bg: "bg-gradient-to-r from-slate-200 to-slate-300" },
    { key: "gold", label: "黄金会员", icon: Gem, color: "text-amber-500", bg: "bg-gradient-to-r from-amber-100 to-amber-200" },
    { key: "diamond", label: "钻石伙伴", icon: Sparkles, color: "text-violet-500", bg: "bg-gradient-to-r from-violet-100 to-purple-200" },
  ];

  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="text-lg">会员等级分布</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">会员等级分布</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {levels.map((level) => {
          const count = data?.[level.key] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={level.key} className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", level.bg)}>
                <level.icon className={cn("w-5 h-5", level.color)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{level.label}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", level.bg)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-400 w-10 text-right">{percentage}%</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// 待处理事项卡片
function PendingTasks({ jobs, machines, loading }: { jobs?: any; machines?: any; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="text-lg">待处理事项</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const tasks = [
    { 
      label: "待审核二手机", 
      count: machines?.pending || 0, 
      icon: Truck, 
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      link: "/admin/machines?status=pending"
    },
    { 
      label: "进行中作业", 
      count: jobs?.open || 0, 
      icon: Briefcase, 
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      link: "/admin/jobs?status=open"
    },
    { 
      label: "已完成作业", 
      count: jobs?.closed || 0, 
      icon: CheckCircle, 
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      link: "/admin/jobs?status=closed"
    },
  ];

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">待处理事项</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <a
            key={task.label}
            href={task.link}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]",
              task.bg
            )}
          >
            <task.icon className={cn("w-5 h-5", task.color)} />
            <span className="flex-1 font-medium text-slate-700 dark:text-slate-300">{task.label}</span>
            <span className={cn("text-2xl font-bold", task.color)}>{task.count}</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

// 注册趋势图
function RegistrationTrend({ data, loading }: { data?: { date: string; count: number }[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="text-lg">近7天注册趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...(data?.map(d => d.count) || [1]));

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">近7天注册趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-40">
          {data?.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const date = new Date(item.date);
            const dayLabel = date.toLocaleDateString("zh-CN", { weekday: "short" });
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg relative" style={{ height: "120px" }}>
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{dayLabel}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.dashboard.stats.useQuery();

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">总览看板</h1>
        <p className="text-slate-500 mt-1">欢迎回来，这是您的平台数据概览</p>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={stats?.users.total || 0}
          icon={Users}
          trend={stats?.users.todayNew || 0}
          trendLabel="今日新增"
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          loading={isLoading}
        />
        <StatCard
          title="作业需求"
          value={stats?.jobs.total || 0}
          icon={Briefcase}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          loading={isLoading}
        />
        <StatCard
          title="二手机挂牌"
          value={stats?.machines.total || 0}
          icon={Truck}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
          loading={isLoading}
        />
        <StatCard
          title="会员收入"
          value={`¥${stats?.orders.totalAmount?.toLocaleString() || 0}`}
          icon={CreditCard}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          loading={isLoading}
        />
      </div>

      {/* 详细数据区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MembershipDistribution data={stats?.membership} loading={isLoading} />
        <PendingTasks jobs={stats?.jobs} machines={stats?.machines} loading={isLoading} />
        <RegistrationTrend data={stats?.registrationTrend} loading={isLoading} />
      </div>

      {/* 快捷操作 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "审核二手机", href: "/admin/machines?status=pending", icon: Truck, color: "from-orange-500 to-amber-500" },
              { label: "管理用户", href: "/admin/users", icon: Users, color: "from-blue-500 to-indigo-500" },
              { label: "查看订单", href: "/admin/memberships", icon: CreditCard, color: "from-violet-500 to-purple-500" },
              { label: "系统配置", href: "/admin/settings", icon: Clock, color: "from-slate-500 to-slate-600" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform", action.color)}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
