import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toDashboardPath } from "@/lib/dashboardNav";

export default function PublishMachineListing() {
  const [routeLocation, navigate] = useLocation();
  const utils = trpc.useUtils();
  const submit = trpc.machineListings.submit.useMutation({
    onSuccess: async () => {
      await utils.admin.adminReview.listPending.invalidate();
    },
  });
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [listingLocation, setListingLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [ok, setOk] = useState(false);

  if (ok) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 flex items-center justify-center pointer-events-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg p-8 text-center rounded-3xl">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">已提交挂牌信息</h2>
          <p className="text-gray-600">当前版本为演示流程，后续将接入真实挂牌与审核。</p>
          <Button className="mt-5 rounded-2xl" onClick={() => navigate(toDashboardPath(routeLocation, "machine-market"))}>
            返回交易频道
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 pointer-events-auto overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(toDashboardPath(routeLocation, "machine-market"))}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>

        <Card className="bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-700" />
              发布二手农机挂牌（权限用户）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：约翰迪尔 7M2204 拖拉机 低小时" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>品牌</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="John Deere / CASE IH" />
              </div>
              <div className="space-y-2">
                <Label>型号</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="7M2204 / Puma2104" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>价格（元）</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例如：680000" />
              </div>
              <div className="space-y-2">
                <Label>所在地</Label>
                <Input value={listingLocation} onChange={(e) => setListingLocation(e.target.value)} placeholder="例如：黑龙江·双鸭山" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[140px]" placeholder="小时数、保养情况、配置、联系方式等" />
            </div>
            <div className="flex justify-end">
              <Button
                disabled={submit.isPending}
                className="rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white"
                onClick={async () => {
                  const p = price.trim() ? Number(price.trim()) : undefined;
                  await submit.mutateAsync({
                    title,
                    brand,
                    model,
                    price: p !== undefined && Number.isFinite(p) ? p : undefined,
                    location: listingLocation || undefined,
                    description: desc || undefined,
                  });
                  setOk(true);
                }}
              >
                {submit.isPending ? "提交中..." : "提交挂牌（待审核）"}
              </Button>
            </div>
            {submit.error && (
              <div className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm">
                {submit.error.message}
              </div>
            )}
            <div className="text-xs text-slate-500">
              提交后进入“待审核”，管理员在审核通过后才会在交易频道展示。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

