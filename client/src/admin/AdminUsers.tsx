/**
 * Admin 用户管理页面
 * 支持搜索、筛选、会员等级管理、账号冻结等操作
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Filter, 
  ChevronLeft, 
  ChevronRight,
  User,
  Shield,
  Crown,
  Gem,
  Sparkles,
  Star,
  Ban,
  CheckCircle,
  MoreHorizontal,
  Eye,
  Settings,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 会员等级配置
const MEMBERSHIP_LEVELS = {
  free: { label: "免费用户", icon: Star, color: "text-slate-500", bg: "bg-slate-100" },
  silver: { label: "白银会员", icon: Crown, color: "text-slate-400", bg: "bg-slate-200" },
  gold: { label: "黄金会员", icon: Gem, color: "text-amber-500", bg: "bg-amber-100" },
  diamond: { label: "钻石伙伴", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-100" },
};

// 用户状态配置
const USER_STATUS = {
  active: { label: "正常", color: "text-emerald-600", bg: "bg-emerald-50" },
  frozen: { label: "已冻结", color: "text-red-600", bg: "bg-red-50" },
  deleted: { label: "已删除", color: "text-slate-400", bg: "bg-slate-100" },
};

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showMembershipDialog, setShowMembershipDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  // 查询用户列表
  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    membershipLevel: membershipFilter !== "all" ? membershipFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  // 用户详情查询
  const { data: userDetail, isLoading: detailLoading } = trpc.admin.users.detail.useQuery(
    { userId: selectedUser?.id },
    { enabled: !!selectedUser?.id && showDetailDialog }
  );

  // Mutations
  const setMembershipMutation = trpc.admin.users.setMembership.useMutation({
    onSuccess: () => {
      toast.success("会员等级已更新");
      refetch();
      setShowMembershipDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const setStatusMutation = trpc.admin.users.setStatus.useMutation({
    onSuccess: () => {
      toast.success("账号状态已更新");
      refetch();
      setShowStatusDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const setAdminMutation = trpc.admin.users.setAdmin.useMutation({
    onSuccess: () => {
      toast.success("管理员权限已更新");
      refetch();
      setShowAdminDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // 表单状态
  const [membershipForm, setMembershipForm] = useState({ level: "free", expiresAt: "", note: "" });
  const [statusForm, setStatusForm] = useState({ status: "active", reason: "" });
  const [adminForm, setAdminForm] = useState({ isAdmin: false, adminRole: "operation" });

  const openMembershipDialog = (user: any) => {
    setSelectedUser(user);
    setMembershipForm({
      level: user.membershipLevel,
      expiresAt: user.membershipExpiresAt ? new Date(user.membershipExpiresAt).toISOString().split("T")[0] : "",
      note: "",
    });
    setShowMembershipDialog(true);
  };

  const openStatusDialog = (user: any) => {
    setSelectedUser(user);
    setStatusForm({
      status: user.status === "frozen" ? "active" : "frozen",
      reason: "",
    });
    setShowStatusDialog(true);
  };

  const openAdminDialog = (user: any) => {
    setSelectedUser(user);
    setAdminForm({
      isAdmin: user.isAdmin !== 1,
      adminRole: user.adminRole || "operation",
    });
    setShowAdminDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">用户管理</h1>
        <p className="text-slate-500 mt-1">管理平台用户、会员等级和账号状态</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索手机号、姓名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="会员等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="free">免费用户</SelectItem>
                <SelectItem value="silver">白银会员</SelectItem>
                <SelectItem value="gold">黄金会员</SelectItem>
                <SelectItem value="diamond">钻石伙伴</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="账号状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="frozen">已冻结</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left p-4 text-sm font-medium text-slate-500">用户</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">会员等级</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">注册时间</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">最后登录</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="p-4"><Skeleton className="h-10 w-48" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : data?.list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  data?.list.map((user) => {
                    const membership = MEMBERSHIP_LEVELS[user.membershipLevel as keyof typeof MEMBERSHIP_LEVELS];
                    const status = USER_STATUS[user.status as keyof typeof USER_STATUS];
                    return (
                      <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                              {user.isAdmin === 1 ? (
                                <Shield className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <User className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">
                                {user.realName || user.name || "未设置"}
                                {user.isAdmin === 1 && (
                                  <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-200">
                                    管理员
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-slate-500">{user.phone || "未绑定手机"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm", membership.bg)}>
                            <membership.icon className={cn("w-4 h-4", membership.color)} />
                            <span className={membership.color}>{membership.label}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                            {user.status === "active" ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(user.lastSignedIn).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedUser(user); setShowDetailDialog(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMembershipDialog(user)}
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openStatusDialog(user)}
                              className={user.status === "frozen" ? "text-emerald-600" : "text-red-600"}
                            >
                              {user.status === "frozen" ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAdminDialog(user)}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用户详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : userDetail && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                  <User className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{userDetail.realName || userDetail.name || "未设置"}</h3>
                  <p className="text-slate-500">{userDetail.phone || "未绑定手机"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">会员等级</p>
                  <p className="font-medium">{MEMBERSHIP_LEVELS[userDetail.membershipLevel as keyof typeof MEMBERSHIP_LEVELS]?.label}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">到期时间</p>
                  <p className="font-medium">{userDetail.membershipExpiresAt ? new Date(userDetail.membershipExpiresAt).toLocaleDateString("zh-CN") : "永久"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">发布作业</p>
                  <p className="font-medium">{userDetail.stats?.jobs || 0} 条</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">发布二手机</p>
                  <p className="font-medium">{userDetail.stats?.machines || 0} 条</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">会员订单</p>
                  <p className="font-medium">{userDetail.stats?.orders || 0} 笔</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">注册时间</p>
                  <p className="font-medium">{new Date(userDetail.createdAt).toLocaleDateString("zh-CN")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 修改会员等级弹窗 */}
      <Dialog open={showMembershipDialog} onOpenChange={setShowMembershipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改会员等级</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.phone || selectedUser?.name} 设置新的会员等级
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">会员等级</label>
              <Select value={membershipForm.level} onValueChange={(v) => setMembershipForm(f => ({ ...f, level: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费用户</SelectItem>
                  <SelectItem value="silver">白银会员 (66元/年)</SelectItem>
                  <SelectItem value="gold">黄金会员 (199元/年)</SelectItem>
                  <SelectItem value="diamond">钻石伙伴</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">到期时间</label>
              <Input
                type="date"
                value={membershipForm.expiresAt}
                onChange={(e) => setMembershipForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">备注</label>
              <Textarea
                value={membershipForm.note}
                onChange={(e) => setMembershipForm(f => ({ ...f, note: e.target.value }))}
                placeholder="可选，记录修改原因"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembershipDialog(false)}>取消</Button>
            <Button
              onClick={() => setMembershipMutation.mutate({
                userId: selectedUser.id,
                level: membershipForm.level as any,
                expiresAt: membershipForm.expiresAt || undefined,
                note: membershipForm.note || undefined,
              })}
              disabled={setMembershipMutation.isPending}
            >
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 冻结/解冻弹窗 */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusForm.status === "frozen" ? "冻结账号" : "解冻账号"}</DialogTitle>
            <DialogDescription>
              {statusForm.status === "frozen" 
                ? "冻结后用户将无法登录和使用平台功能"
                : "解冻后用户可以正常使用平台"}
            </DialogDescription>
          </DialogHeader>
          {statusForm.status === "frozen" && (
            <div>
              <label className="text-sm font-medium">冻结原因</label>
              <Textarea
                value={statusForm.reason}
                onChange={(e) => setStatusForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="请输入冻结原因"
                className="mt-1"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>取消</Button>
            <Button
              variant={statusForm.status === "frozen" ? "destructive" : "default"}
              onClick={() => setStatusMutation.mutate({
                userId: selectedUser.id,
                status: statusForm.status as any,
                reason: statusForm.reason || undefined,
              })}
              disabled={setStatusMutation.isPending}
            >
              确认{statusForm.status === "frozen" ? "冻结" : "解冻"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 设置管理员弹窗 */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adminForm.isAdmin ? "设为管理员" : "取消管理员"}</DialogTitle>
            <DialogDescription>
              {adminForm.isAdmin 
                ? "设为管理员后，该用户可以访问后台管理系统"
                : "取消管理员权限后，该用户将无法访问后台"}
            </DialogDescription>
          </DialogHeader>
          {adminForm.isAdmin && (
            <div>
              <label className="text-sm font-medium">管理员角色</label>
              <Select value={adminForm.adminRole} onValueChange={(v) => setAdminForm(f => ({ ...f, adminRole: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                  <SelectItem value="operation">运营管理员</SelectItem>
                  <SelectItem value="support">客服支持</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>取消</Button>
            <Button
              onClick={() => setAdminMutation.mutate({
                userId: selectedUser.id,
                isAdmin: adminForm.isAdmin,
                adminRole: adminForm.isAdmin ? adminForm.adminRole as any : undefined,
              })}
              disabled={setAdminMutation.isPending}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
