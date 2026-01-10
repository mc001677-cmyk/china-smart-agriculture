import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Sparkles, ShieldCheck, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function MembershipCenter() {
  const { data: user, refetch: refetchUser } = trpc.auth.me.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.membership.summary.useQuery();
  const createOrder = trpc.membership.createOrder.useMutation();
  const mockPay = trpc.membership.mockPay.useMutation();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    try {
      setIsProcessing(true);
      // 1. 创建订单
      const order = await createOrder.mutateAsync({ plan: "silver" });
      if (!order.success || !order.orderId) throw new Error("创建订单失败");

      toast.info("正在模拟支付流程...", { description: "金额：¥ 66.00" });

      // 2. 模拟支付
      await new Promise(resolve => setTimeout(resolve, 1500));
      const result = await mockPay.mutateAsync({ orderId: order.orderId });

      if (result.success) {
        toast.success("升级成功！", { description: "您已正式成为白银会员" });
        await refetchUser();
        await refetchSummary();
      }
    } catch (error: any) {
      toast.error("操作失败", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const membershipTiers = [
    {
      id: "free",
      name: "免费用户",
      price: "¥ 0",
      description: "基础浏览与设备查看",
      icon: <Star className="w-6 h-6 text-slate-400" />,
      features: [
        { text: "查看作业需求列表", included: true },
        { text: "查看二手机交易信息", included: true },
        { text: "查看二手机联系方式", included: true },
        { text: "查看作业需求联系方式", included: false },
        { text: "发布作业需求", included: false },
      ],
      current: user?.membershipLevel === "free" || !user?.membershipLevel,
    },
    {
      id: "silver",
      name: "白银会员",
      price: "¥ 66 / 年",
      description: "解锁核心作业联系权限",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      features: [
        { text: "查看作业需求列表", included: true },
        { text: "查看二手机交易信息", included: true },
        { text: "查看二手机联系方式", included: true },
        { text: "解锁作业需求联系方式", included: true },
        { text: "发布作业需求权限", included: true },
      ],
      current: user?.membershipLevel === "silver",
      popular: true,
    },
    {
      id: "gold",
      name: "黄金会员",
      price: "敬请期待",
      description: "深度数据分析与优先展示",
      icon: <Sparkles className="w-6 h-6 text-yellow-500" />,
      features: [
        { text: "包含白银会员所有权益", included: true },
        { text: "高清作业轨迹回放", included: true },
        { text: "深度产量热力图分析", included: true },
        { text: "发布信息优先展示", included: true },
      ],
      current: user?.membershipLevel === "gold",
      disabled: true,
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">会员中心</h1>
          <p className="text-muted-foreground mt-1">管理您的会员等级，解锁更多智慧农业能力</p>
        </div>
        {user && (
          <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{user.name || "农场用户"}</span>
                <Badge variant={user.membershipLevel === "free" ? "secondary" : "default"} className="bg-primary/20 text-primary border-none">
                  {user.membershipLevel === "silver" ? "白银会员" : user.membershipLevel === "gold" ? "黄金会员" : "免费用户"}
                </Badge>
              </div>
              {summary?.isActive && summary.membershipExpiresAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  有效期至：{format(new Date(summary.membershipExpiresAt), "yyyy年MM月dd日", { locale: zhCN })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {membershipTiers.map((tier) => (
          <Card 
            key={tier.id} 
            className={`relative overflow-hidden border-none glass-card transition-apple hover:scale-[1.02] ${tier.popular ? 'ring-2 ring-primary/50' : ''}`}
          >
            {tier.popular && (
              <div className="absolute top-0 right-0">
                <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  最受欢迎
                </div>
              </div>
            )}
            <CardHeader>
              <div className="mb-2">{tier.icon}</div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.id === "silver" && <span className="text-muted-foreground text-sm">/ 年</span>}
              </div>
              
              <ul className="space-y-3">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {tier.current ? (
                <Button className="w-full rounded-xl" variant="outline" disabled>
                  当前等级
                </Button>
              ) : (
                <Button 
                  className="w-full rounded-xl shadow-apple" 
                  disabled={tier.disabled || isProcessing}
                  onClick={tier.id === "silver" ? handleUpgrade : undefined}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {tier.disabled ? "即将推出" : `立即升级`}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Rules Notice */}
      <div className="glass-card p-6 rounded-2xl border-l-4 border-primary">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          会员规则说明
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">作业需求权限：</p>
            <p>• 免费用户可查看需求内容，但无法查看农场主联系方式（电话、微信、地址）。</p>
            <p>• 白银会员（66元/年）可解锁全部联系方式，直接与农场主沟通。</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">二手机交易权限：</p>
            <p>• 二手机联系方式对所有注册用户开放，不做会员限制。</p>
            <p>• 平台仅提供信息展示，请自行甄别交易风险。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
