/**
 * Admin 系统日志页面
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  LogIn,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  User,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState("sms");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // 短信日志
  const { data: smsLogs, isLoading: smsLoading } = trpc.admin.logs.sms.useQuery(
    { page, pageSize: 20, phone: search || undefined },
    { enabled: activeTab === "sms" }
  );

  // 登录日志
  const { data: loginLogs, isLoading: loginLoading } = trpc.admin.logs.login.useQuery(
    { page, pageSize: 20 },
    { enabled: activeTab === "login" }
  );

  const smsTotalPages = smsLogs ? Math.ceil(smsLogs.total / smsLogs.pageSize) : 0;
  const loginTotalPages = loginLogs ? Math.ceil(loginLogs.total / loginLogs.pageSize) : 0;

  const renderSmsScene = (scene: string) => {
    switch (scene) {
      case "register":
        return "注册";
      case "login":
        return "登录";
      case "resetPassword":
        return "重置密码";
      case "bindPhone":
        return "绑定";
      default:
        return scene || "其他";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">系统日志</h1>
        <p className="text-slate-500 mt-1">查看短信发送记录和用户登录日志</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            短信日志
          </TabsTrigger>
          <TabsTrigger value="login" className="gap-2">
            <LogIn className="w-4 h-4" />
            登录日志
          </TabsTrigger>
        </TabsList>

        {/* 短信日志 */}
        <TabsContent value="sms" className="space-y-4">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索手机号..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 text-sm font-medium text-slate-500">手机号</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">类型</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">状态</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">服务商</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">发送时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="p-4"><Skeleton className="h-6 w-28" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                        </tr>
                      ))
                    ) : smsLogs?.list.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">暂无日志数据</td>
                      </tr>
                    ) : (
                      smsLogs?.list.map((log) => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <span className="font-mono">{log.phone}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600">
                              {renderSmsScene(log.scene)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              log.status === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {log.status === "success" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {log.status === "success" ? "已发送" : "失败"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{log.provider || "mock"}</td>
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {smsLogs && smsTotalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">共 {smsLogs.total} 条，第 {smsLogs.page}/{smsTotalPages} 页</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(smsTotalPages, p + 1))} disabled={page === smsTotalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 登录日志 */}
        <TabsContent value="login" className="space-y-4">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 text-sm font-medium text-slate-500">用户</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">登录方式</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">IP 地址</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">设备</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">登录时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-28" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-40" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                        </tr>
                      ))
                    ) : loginLogs?.list.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">暂无登录日志</td>
                      </tr>
                    ) : (
                      loginLogs?.list.map((log) => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span>{log.userId ? `用户#${log.userId}` : "未知用户"}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                              {log.loginMethod || "未知"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Globe className="w-4 h-4 text-slate-400" />
                              {log.ip || "未知"}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-600 max-w-[200px] truncate">
                            {log.userAgent || "未知设备"}
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {loginLogs && loginTotalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">共 {loginLogs.total} 条，第 {loginLogs.page}/{loginTotalPages} 页</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(loginTotalPages, p + 1))} disabled={page === loginTotalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
