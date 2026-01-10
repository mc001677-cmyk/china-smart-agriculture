import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  ClipboardCheck, Tractor, UserCircle2, ShieldAlert, 
  Sparkles, Megaphone, ShoppingCart, Crown, 
  Gem, Star, CheckCircle2, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toDashboardPath } from "@/lib/dashboardNav";

function statusLabel(s?: string) {
  switch (s) {
    case "approved":
      return { text: "已通过审核", variant: "default" as const, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    case "pending":
      return { text: "审核中", variant: "secondary" as const, color: "text-amber-600 bg-amber-50 border-amber-200" };
    case "rejected":
      return { text: "已驳回", variant: "destructive" as const, color: "text-rose-600 bg-rose-50 border-rose-200" };
    case "unsubmitted":
    default:
      return { text: "未提交审核", variant: "outline" as const, color: "text-slate-500 bg-slate-50 border-slate-200" };
  }
}

const MEMBERSHIP_PLANS = [
  {
    id: "free",
    name: "普通农户",
    icon: Star,
    color: "from-slate-400 to-slate-600",
    features: ["基础地图查看", "机队状态监控", "作业日志记录"],
    price: "免费",
  },
  {
    id: "silver",
    name: "白银会员",
    icon: Crown,
    color: "from-blue-400 to-blue-600",
    features: ["发布作业需求", "发布二手农机", "实名认证标识"],
    price: "¥66/年",
  },
  {
    id: "gold",
    name: "黄金会员",
    icon: Gem,
    color: "from-amber-400 to-amber-600",
    features: ["10台物联设备绑定", "高级产量分析报告", "优先客服支持"],
    price: "绑定设备升级",
  },
  {
    id: "diamond",
    name: "钻石合作伙伴",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600",
    features: ["区域代理权限", "无限设备绑定", "定制化报表系统"],
    price: "商务洽谈",
  }
];

export default function OnboardingCenter() {
  const [location, navigate] = useLocation();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: membershipSummary } = trpc.membership.summary.useQuery(undefined, { enabled: !!me });
  const createOrder = trpc.membership.createOrder.useMutation();
  const [message, setMessage] = useState<string | null>(null);

  const status = statusLabel((me as any)?.verificationStatus);
  const note = (me as any)?.verificationNote as string | null | undefined;
  const canPublish = me && ((me as any).role === "admin" || (me as any).verificationStatus === "approved");
  const currentLevel = membershipSummary?.membershipLevel ?? (me as any)?.membershipLevel ?? "free";

  return (
    <div className="h-full w-full p-8 overflow-y-auto bg-[#FBFBFD] dark:bg-[#1D1D1F]">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">
              会员与认证中心
            </h1>
            <p className="text-lg text-[#86868B] max-w-2xl">
              升级您的农场管理体验。通过实名认证与会员升级，解锁更多专业级农业管理工具。
            </p>
          </div>
          <div className={cn("px-4 py-2 rounded-full border text-sm font-medium transition-all shadow-sm", status.color)}>
            {status.text}
          </div>
        </div>

        {/* Membership Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrent = currentLevel === plan.id;
            const Icon = plan.icon;
            return (
              <Card key={plan.id} className={cn(
                "relative overflow-hidden border-none shadow-apple  ",
                isCurrent ? "ring-2 ring-primary" : "bg-white/80 dark:bg-white/5 backdrop-blur-xl"
              )}>
                {isCurrent && (
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", plan.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <p className="text-2xl font-black mt-2">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#424245] dark:text-[#A1A1A6]">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={cn(
                      "w-full rounded-xl font-semibold ",
                      isCurrent ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-[#F5F5F7] dark:bg-white/10 text-[#1D1D1F] dark:text-white hover:bg-[#E8E8ED]"
                    )}
                    disabled={isCurrent || createOrder.isPending}
                    onClick={async () => {
                      if (plan.id === "diamond") {
                        navigate(toDashboardPath(location, "identity"));
                        return;
                      }
                      setMessage(null);
                      await createOrder.mutateAsync({ plan: plan.id as any });
                      setMessage(`已创建${plan.name}订单，请联系管理员确认。`);
                    }}
                  >
                    {isCurrent ? "当前等级" : plan.id === "diamond" ? "联系我们" : "立即升级"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Verification */}
          <Card className="glass-card border-none rounded-[2rem] overflow-hidden group">
            <div className="p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 group-hover:scale-110 ">
                <UserCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">实名身份认证</h3>
              <p className="text-[#86868B] mb-8 flex-grow">
                开通发布权限的必经之路。认证通过后，您可以发布作业需求、二手农机挂牌，并获得官方认证标识。
              </p>
              <Button 
                className="w-fit rounded-full px-8 bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:opacity-90"
                onClick={() => navigate(toDashboardPath(location, "identity"))}
              >
                立即认证 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Machine Registration */}
          <Card className="glass-card border-none rounded-[2rem] overflow-hidden group">
            <div className="p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 group-hover:scale-110 ">
                <Tractor className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">农机设备注册</h3>
              <p className="text-[#86868B] mb-8 flex-grow">
                将您的智能农机接入云端。支持 John Deere, CASE IH 等主流品牌，实现远程监控、轨迹回放与效率分析。
              </p>
              <Button 
                variant="outline"
                className="w-fit rounded-full px-8 border-2 hover:bg-slate-50 "
                onClick={() => navigate(toDashboardPath(location, "machine-register"))}
              >
                添加设备 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Notification Area */}
        {(note || message) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
              "p-6 rounded-[1.5rem] border flex items-start gap-4",
              note ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
            )}>
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold text-lg">{note ? "审核反馈" : "操作成功"}</h4>
                <p className="mt-1 opacity-90 whitespace-pre-wrap">{note || message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Quick Access */}
        {me?.role === "admin" && (
          <div className="pt-10 border-t border-[#D2D2D7] dark:border-[#424245]">
            <p className="text-sm text-[#86868B] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              管理员控制台：
              <button 
                className="text-primary font-medium hover:underline" 
                onClick={() => navigate("/admin/reviews")}
              >
                进入审核列表
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
