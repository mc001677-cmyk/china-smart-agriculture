/**
 * Admin 后台主入口
 * 包含权限检查和子路由
 */
import { Route, Switch, useLocation, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminJobs from "./AdminJobs";
import AdminMachines from "./AdminMachines";
import AdminMemberships from "./AdminMemberships";
import AdminLogs from "./AdminLogs";
import AdminSettings from "./AdminSettings";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminApp() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const [, setLocation] = useLocation();

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500">正在验证权限...</p>
        </div>
      </div>
    );
  }

  // 未登录
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <ShieldX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">需要登录</h1>
          <p className="text-slate-500 mb-6">请先登录后再访问管理后台</p>
          <Button onClick={() => setLocation("/login")}>
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  // 非管理员
  if (user.isAdmin !== 1 && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <ShieldX className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">权限不足</h1>
          <p className="text-slate-500 mb-6">您没有访问管理后台的权限，请联系管理员</p>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  // 管理员视图
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/jobs" component={AdminJobs} />
        <Route path="/admin/machines" component={AdminMachines} />
        <Route path="/admin/memberships" component={AdminMemberships} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route>
          <Redirect to="/admin" />
        </Route>
      </Switch>
    </AdminLayout>
  );
}
