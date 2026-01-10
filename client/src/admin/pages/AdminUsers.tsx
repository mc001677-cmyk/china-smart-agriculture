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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, ShieldAlert, ShieldCheck, Ban, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");

  const { data, refetch, isLoading } = trpc.admin.users.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
  });

  const setStatusMutation = trpc.admin.users.setStatus.useMutation();
  const setAdminMutation = trpc.admin.users.setAdmin.useMutation();
  const setMembershipMutation = trpc.admin.users.setMembership.useMutation();

  const handleSearch = () => {
    setPage(1);
    setSearch(inputValue);
  };

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "frozen" : "active";
    const action = newStatus === "frozen" ? "冻结" : "解冻";
    if (!confirm(`确定要${action}该用户吗？`)) return;

    try {
        await setStatusMutation.mutateAsync({ userId, status: newStatus as any });
        toast.success(`用户已${action}`);
        refetch();
    } catch (e: any) {
        toast.error("操作失败", { description: e.message });
    }
  };

  const handleToggleAdmin = async (userId: number, isAdmin: boolean) => {
    const action = isAdmin ? "取消管理员" : "设为管理员";
    if (!confirm(`确定要${action}吗？此操作涉及系统安全！`)) return;

    try {
        await setAdminMutation.mutateAsync({ userId, isAdmin: !isAdmin });
        toast.success(`操作成功：${action}`);
        refetch();
    } catch (e: any) {
        toast.error("操作失败", { description: e.message });
    }
  };

  const handleSetMembership = async (userId: number) => {
    const level = (window.prompt("设置会员等级：free/silver/gold/diamond", "silver") || "").trim();
    if (!level) return;
    if (!["free", "silver", "gold", "diamond"].includes(level)) {
      toast.error("会员等级不合法");
      return;
    }
    const expiresAt = (window.prompt("到期日期（可选，YYYY-MM-DD）", "") || "").trim();
    const note = (window.prompt("备注（可选）", "") || "").trim();

    try {
      await setMembershipMutation.mutateAsync({
        userId,
        level: level as any,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        note: note || undefined,
      });
      toast.success("会员等级已更新");
      refetch();
    } catch (e: any) {
      toast.error("操作失败", { description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="用户管理" description="管理系统用户、权限与状态" />

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="搜索手机号、姓名..."
                className="pl-9"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>会员等级</TableHead>
                    <TableHead>身份认证</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            加载中...
                        </TableCell>
                    </TableRow>
                ) : data?.list.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            暂无用户
                        </TableCell>
                    </TableRow>
                ) : (
                    data?.list.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{user.name || "未命名"}</span>
                                    <span className="text-xs text-muted-foreground">{user.phone || "无手机号"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getMembershipBadgeVariant(user.membershipLevel)}>
                                    {getMembershipLabel(user.membershipLevel)}
                                </Badge>
                                {user.isAdmin ? <Badge variant="destructive" className="ml-2">管理员</Badge> : null}
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.verificationStatus === 'approved' ? "outline" : "secondary"}>
                                    {getVerificationLabel(user.verificationStatus)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(user.createdAt), "yyyy-MM-dd")}
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "flex items-center gap-1.5 text-sm",
                                    user.status === 'active' ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", user.status === 'active' ? "bg-green-500" : "bg-red-500")} />
                                    {user.status === 'active' ? "正常" : "冻结"}
                                </span>
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
                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.phone || "")}>
                                            复制手机号
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleSetMembership(user.id)}>
                                            修改会员等级
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status as string)}>
                                            {user.status === 'active' ? (
                                                <><Ban className="mr-2 h-4 w-4" /> 冻结账号</>
                                            ) : (
                                                <><UserCheck className="mr-2 h-4 w-4" /> 解冻账号</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => handleToggleAdmin(user.id, !!user.isAdmin)}
                                        >
                                            {user.isAdmin ? (
                                                <><ShieldAlert className="mr-2 h-4 w-4" /> 取消管理员</>
                                            ) : (
                                                <><ShieldCheck className="mr-2 h-4 w-4" /> 设为管理员</>
                                            )}
                                        </DropdownMenuItem>
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

function getMembershipBadgeVariant(level: string | null): "default" | "secondary" | "destructive" | "outline" {
    switch (level) {
        case "gold": return "default"; // Gold color handled via CSS usually, or just default
        case "silver": return "secondary";
        case "diamond": return "destructive"; // Distinctive
        default: return "outline";
    }
}

function getMembershipLabel(level: string | null) {
    switch (level) {
        case "silver": return "白银会员";
        case "gold": return "黄金会员";
        case "diamond": return "钻石会员";
        default: return "免费用户";
    }
}

function getVerificationLabel(status: string | null) {
    switch (status) {
        case "approved": return "已认证";
        case "pending": return "待审核";
        case "rejected": return "已驳回";
        default: return "未认证";
    }
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}
