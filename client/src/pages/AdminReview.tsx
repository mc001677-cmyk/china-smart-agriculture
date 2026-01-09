import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

export default function AdminReview() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data } = trpc.adminReview.listPending.useQuery();

  const approveUser = trpc.adminReview.approveUser.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });
  const rejectUser = trpc.adminReview.rejectUser.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });
  const approveMachine = trpc.adminReview.approveMachine.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });
  const rejectMachine = trpc.adminReview.rejectMachine.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });
  const approveListing = trpc.adminReview.approveListing.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });
  const rejectListing = trpc.adminReview.rejectListing.useMutation({
    onSuccess: async () => {
      await utils.adminReview.listPending.invalidate();
    },
  });

  const [note, setNote] = useState("");

  return (
    <div className="pointer-events-auto h-full w-full p-6 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard/onboarding")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>

        <Card className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-lg">
          <CardHeader>
            <CardTitle>管理员审核</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">审核备注（可选，驳回建议填写原因）</div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[90px]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">待审核用户（身份介绍）</div>
                {(data?.users ?? []).length === 0 ? (
                  <div className="text-sm text-slate-500">暂无</div>
                ) : (
                  (data?.users ?? []).map((u: any) => (
                    <div key={u.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <div className="font-semibold text-slate-900">{u.realName || u.name || `用户#${u.id}`}</div>
                      <div className="text-xs text-slate-500 mt-1">{u.organization || "-"}</div>
                      <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{u.identityIntro || "-"}</div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => approveUser.mutate({ userId: u.id, note: note || undefined })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl"
                          onClick={() => rejectUser.mutate({ userId: u.id, note: note || "资料不完整，请补充" })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          驳回
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">待审核设备（注册申请）</div>
                {(data?.machines ?? []).length === 0 ? (
                  <div className="text-sm text-slate-500">暂无</div>
                ) : (
                  (data?.machines ?? []).map((m: any) => (
                    <div key={m.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <div className="font-semibold text-slate-900">{m.brand} {m.model}</div>
                      <div className="text-xs text-slate-500 mt-1">deviceId: {m.deviceId}</div>
                      <div className="text-xs text-slate-500 mt-1">类型: {m.type} 车牌/机号: {m.licensePlate || "-"}</div>
                      {m.description && <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{m.description}</div>}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => approveMachine.mutate({ applicationId: m.id, note: note || undefined })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          通过并入库
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl"
                          onClick={() => rejectMachine.mutate({ applicationId: m.id, note: note || "资料不完整，请补充" })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          驳回
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <div className="text-sm font-semibold text-slate-900">待审核二手农机挂牌</div>
              {(data as any)?.listings?.length === 0 ? (
                <div className="text-sm text-slate-500">暂无</div>
              ) : (
                ((data as any)?.listings ?? []).map((l: any) => (
                  <div key={l.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                    <div className="font-semibold text-slate-900">{l.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{l.brand} {l.model} · {l.location || "-"}</div>
                    {l.description && <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{l.description}</div>}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => approveListing.mutate({ listingId: l.id, note: note || undefined })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        通过并上架
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => rejectListing.mutate({ listingId: l.id, note: note || "资料不完整，请补充" })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        驳回
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

