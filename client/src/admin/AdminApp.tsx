import { Switch, Route, useLocation } from "wouter";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminOrders from "./pages/AdminOrders";
import AdminReview from "./pages/AdminReview";
import AdminMachines from "./pages/AdminMachines";
import AdminJobs from "./pages/AdminJobs";
import AdminSettings from "./pages/AdminSettings";
import AdminLogs from "./pages/AdminLogs";

// 临时占位组件
// const Placeholder ... (已不再需要大量占位)

export default function AdminApp() {
  const [location] = useLocation();

  return (
    <AdminLayout>
      <Switch>
        {/* 仪表盘 */}
        <Route path="/admin" component={AdminDashboard} />
        
        {/* 用户管理 */}
        <Route path="/admin/users" component={AdminUsers} />
        
        {/* 订单管理 */}
        <Route path="/admin/orders" component={AdminOrders} />
        
        {/* 农机管理 */}
        <Route path="/admin/machines" component={AdminMachines} />
        
        {/* 作业需求 */}
        <Route path="/admin/jobs" component={AdminJobs} />
        
        {/* 审核中心 */}
        <Route path="/admin/reviews" component={AdminReview} />
        
        {/* 系统设置 */}
        <Route path="/admin/settings" component={AdminSettings} />
        
        {/* 日志 */}
        <Route path="/admin/logs" component={AdminLogs} />

        {/* 404 */}
        <Route>
            <div className="text-center py-20">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-muted-foreground">页面不存在</p>
            </div>
        </Route>
      </Switch>
    </AdminLayout>
  );
}
