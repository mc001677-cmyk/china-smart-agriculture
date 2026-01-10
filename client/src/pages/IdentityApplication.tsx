import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toDashboardPath } from "@/lib/dashboardNav";

export default function IdentityApplication() {
  const [location, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const submit = trpc.onboarding.submitIdentity.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate(toDashboardPath(location, "onboarding"));
    },
  });

  const [realName, setRealName] = useState(((me as any)?.realName as string) ?? "");
  const [organization, setOrganization] = useState(((me as any)?.organization as string) ?? "");
  const [intro, setIntro] = useState(((me as any)?.identityIntro as string) ?? "");

  const disabled = submit.isPending;

  return (
    <div className="pointer-events-auto h-full w-full p-6 overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(toDashboardPath(location, "onboarding"))}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>

        <Card className="bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              身份介绍（人工审核）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>真实姓名</Label>
              <Input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="例如：张三" />
            </div>
            <div className="space-y-2">
              <Label>单位/组织</Label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="例如：友谊农场 / XX合作社 / XX机手服务队" />
            </div>
            <div className="space-y-2">
              <Label>身份介绍</Label>
              <Textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="请描述你的身份、规模、服务范围、主要需求等（至少10字）"
                className="min-h-[160px]"
              />
            </div>

            {submit.error && (
              <div className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm">
                {submit.error.message}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                disabled={disabled}
                className="rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white"
                onClick={() => submit.mutate({ realName, organization, intro })}
              >
                提交审核
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              提交后状态将变为“审核中”，通过后自动开通发布权限（作业需求/二手农机）。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

