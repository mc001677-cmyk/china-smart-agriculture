import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import { Crown, Database, ShieldCheck, UserCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toDashboardPath } from "@/lib/dashboardNav";

export default function SettingsCenter() {
  const [location, setLocation] = useLocation();

  const items = [
    {
      title: "会员中心 / 升级",
      desc: "开通白银会员、查看会员有效期与权益说明",
      icon: Crown,
      onClick: () => setLocation(toDashboardPath(location, "membership")),
    },
    {
      title: "身份与实名认证",
      desc: "提交实名资料，解锁发布与接单相关权限",
      icon: UserCircle,
      onClick: () => setLocation(toDashboardPath(location, "identity")),
    },
    {
      title: "设备注册与绑定",
      desc: "把农机接入平台，支持监控、轨迹与分析能力",
      icon: ShieldCheck,
      onClick: () => setLocation(toDashboardPath(location, "machine-register")),
    },
    {
      title: "目录数据 / 地块管理",
      desc: "维护地块台账、作物类型、面积与状态",
      icon: Database,
      onClick: () => setLocation(toDashboardPath(location, "fields")),
    },
  ];

  return (
    <div className="min-h-full p-6 bg-background">
      <SectionHeader
        title="设置中心"
        description="系统入口统一收口：账号、认证、设备与基础数据"
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className={cn("bg-card border-border hover:shadow-md transition-shadow")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">{item.desc}</div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full" onClick={item.onClick}>
                    打开
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

