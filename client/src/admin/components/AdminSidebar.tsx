import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
  Tractor,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const logout = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      window.location.href = "/login";
    } catch (error) {
      toast.error("登出失败");
    }
  };

  const menuItems = [
    { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
    { href: "/admin/users", label: "用户管理", icon: Users },
    { href: "/admin/orders", label: "订单管理", icon: ShoppingBag },
    { href: "/admin/machines", label: "农机管理", icon: Tractor },
    { href: "/admin/jobs", label: "作业需求", icon: List },
    { href: "/admin/reviews", label: "审核中心", icon: ShieldCheck },
    { href: "/admin/settings", label: "系统设置", icon: Settings },
    { href: "/admin/logs", label: "系统日志", icon: FileText },
  ];

  return (
    <div className={cn("pb-12 min-h-screen bg-card border-r border-border w-64 flex flex-col", className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            后台管理系统
          </h2>
          <div className="space-y-1 mt-6">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <div className="px-3 py-4 border-t border-border space-y-2">
         <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">主题设置</span>
            <ThemeToggle />
         </div>
         <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleLogout}
         >
            <LogOut className="h-4 w-4" />
            退出登录
         </Button>
      </div>
    </div>
  );
}
