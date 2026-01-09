import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ClipboardCheck, Tractor, UserCircle2, ShieldAlert, Sparkles, Megaphone, ShoppingCart } from "lucide-react";
import { useState } from "react";

function statusLabel(s?: string) {
  switch (s) {
    case "approved":
      return { text: "已通过审核", variant: "default" as const };
    case "pending":
      return { text: "审核中", variant: "secondary" as const };
    case "rejected":
      return { text: "已驳回", variant: "destructive" as const };
    case "unsubmitted":
    default:
      return { text: "未提交审核", variant: "outline" as const };
  }
}

export default function OnboardingCenter() {
  const [, navigate] = useLocation();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: membershipSummary } = trpc.membership.summary.useQuery(undefined, { enabled: !!me });
  const createOrder = trpc.membership.createOrder.useMutation();
  const [message, setMessage] = useState<string | null>(null);

  const status = statusLabel((me as any)?.verificationStatus);
  const note = (me as any)?.verificationNote as string | null | undefined;
  const canPublish = me && ((me as any).role === "admin" || (me as any).verificationStatus === "approved");
  const membershipLevel = membershipSummary?.membershipLevel ?? (me as any)?.membershipLevel ?? "free";
  const devicesOwned = membershipSummary?.devicesOwned ?? (me as any)?.devicesOwned ?? 0;
  const membershipExpiresAt = membershipSummary?.membershipExpiresAt as string | null | undefined;

  return (
    <div className="pointer-events-auto h-full w-full p-6 overflow-y-auto bg-gradient-to-br from-amber-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center ring-1 ring-black/5 shadow">
              <ClipboardCheck className="h-6 w-6 text-[#1f6b3a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">注册与审核中心</h1>
              <p className="text-sm text-slate-600 mt-1">
                完成身份介绍与设备注册申请，等待人工审核；通过后可发布作业需求与二手农机信息。
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.text}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/80 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-5 w-5 text-amber-600" />
                会员权益
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full border-amber-400 text-amber-700">
                  {membershipLevel === "free" ? "免费版" : membershipLevel === "silver" ? "白银会员" : membershipLevel === "gold" ? "黄金会员" : "钻石会员"}
                </Badge>
                {membershipExpiresAt && <span className="text-xs text-slate-500">到期：{new Date(membershipExpiresAt).toLocaleDateString()}</span>}
              </div>
              <div>白银：年费 66 元，可发布作业/设备，需实名认证。</div>
              <div>黄金：绑定 10 台物联设备，实名认证后每天发布上限 5 条。</div>
              <div>钻石：区域代理洽谈，权限无限制。</div>
              <div className="text-xs text-emerald-700">
                已绑定设备：{devicesOwned} 台
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  size="sm"
                  className="rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white"
                  onClick={async () => {
                    setMessage(null);
                    await createOrder.mutateAsync({ plan: "silver" });
                    setMessage("已创建白银会员订单，请联系管理员完成支付确认。");
                  }}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "提交中..." : "购买白银会员"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={async () => {
                    setMessage(null);
                    await createOrder.mutateAsync({ plan: "device_bundle", deviceCount: 1, note: "购买物联网设备：免认证费获白银资格" });
                    setMessage("已创建设备订单，请联系管理员确认收款与发货。");
                  }}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "提交中..." : "绑定设备升级"}
                </Button>
              </div>
              {message && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShieldAlert className="h-5 w-5 text-emerald-700" />
                钻石会员申请
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <div>提交区域、组织与联系人信息，管理员将与您洽谈代理合作。</div>
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => navigate("/dashboard/identity")}>
                提交申请资料
              </Button>
            </CardContent>
          </Card>
        </div>

        {note && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-semibold">审核备注</div>
              <div className="text-amber-800 mt-1 whitespace-pre-wrap">{note}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <Card className="bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <UserCircle2 className="h-5 w-5 text-emerald-700" />
                填写身份介绍
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                用于开通发布权限：作业需求发布、二手农机发布等。
              </p>
              <Button className="rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white" onClick={() => navigate("/dashboard/identity")}>
                去填写
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Tractor className="h-5 w-5 text-amber-700" />
                添加农机设备注册
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                提交设备品牌/型号/设备ID等资料，管理员审核通过后加入正式机队。
              </p>
              <Button variant="outline" className="rounded-2xl" onClick={() => navigate("/dashboard/machine-register")}>
                去添加
              </Button>
            </CardContent>
          </Card>
        </div>

        {canPublish && (
          <Card className="mt-6 bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 text-white ring-1 ring-black/10 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                已开通发布权限
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/85">
                你已通过人工审核：现在可以发布作业需求，以及发布二手农机挂牌信息。
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="rounded-2xl bg-white text-emerald-800 hover:bg-white/90"
                  onClick={() => navigate("/dashboard/marketplace")}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  去发布作业需求
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/40 text-white hover:bg-white/10"
                  onClick={() => navigate("/dashboard/publish-machine")}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  去发布二手农机
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-xs text-slate-500">
          管理员入口：<button className="underline" onClick={() => navigate("/dashboard/admin-review")}>审核列表</button>
        </div>
      </div>
    </div>
  );
}

