import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Toaster } from "@/components/ui/sonner";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { getCurrentPathWithQueryHash, toLoginPath } from "@/lib/authPaths";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const bootstrapAdmin = trpc.auth.bootstrapAdmin.useMutation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    const isAdmin = !!user && ((user as any).role === "admin" || (user as any).isAdmin === 1);
    if (isAdmin) {
      // 兼容后端：adminProcedure 支持 role=admin 或 isAdmin=1
      // 这里直接放行即可
    } else {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold">{user ? "无权访问" : "请先登录"}</h1>
          <p className="text-muted-foreground">
            {user ? "该区域仅限管理员访问。" : "后台管理仅对管理员开放，请先登录管理员账号。"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={toLoginPath(getCurrentPathWithQueryHash())}
              className="text-primary hover:underline"
            >
              去登录
            </a>

            {import.meta.env.DEV && user ? (
              <Button
                variant="outline"
                disabled={bootstrapAdmin.isPending}
                onClick={async () => {
                  try {
                    await bootstrapAdmin.mutateAsync();
                    toast.success("已初始化为管理员，正在刷新…");
                    window.location.reload();
                  } catch (e: any) {
                    toast.error("初始化失败", { description: e?.message || "请查看控制台/服务端日志" });
                  }
                }}
              >
                一键初始化为管理员（仅本地开发）
              </Button>
            ) : null}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex" />
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
            {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
