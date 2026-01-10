import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Toaster } from "@/components/ui/sonner";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    // 简单的权限拦截，未登录或非管理员直接跳转登录页（或显示无权访问）
    if (typeof window !== "undefined") {
        // window.location.href = "/login"; // 暂时注释，避免无限跳转，改为显示错误
    }
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
            <h1 className="text-2xl font-bold">无权访问</h1>
            <p className="text-muted-foreground">该区域仅限管理员访问。</p>
            <a href="/login" className="text-primary hover:underline">返回登录</a>
        </div>
    );
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
