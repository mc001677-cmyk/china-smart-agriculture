import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Tractor } from "lucide-react";
import { toDashboardPath } from "@/lib/dashboardNav";

const BRAND_OPTIONS = [
  { id: "john_deere", label: "约翰迪尔（John Deere）" },
  { id: "case_ih", label: "凯斯（CASE IH）" },
  { id: "new_holland", label: "纽荷兰（New Holland）" },
  { id: "claas", label: "克拉斯（CLAAS）" },
];

export default function MachineRegistration() {
  const [location, navigate] = useLocation();
  const submit = trpc.onboarding.submitMachineApplication.useMutation({
    onSuccess: () => navigate(toDashboardPath(location, "onboarding")),
  });

  const [brand, setBrand] = useState("john_deere");
  const [model, setModel] = useState("");
  const [type, setType] = useState<"tractor" | "harvester" | "seeder" | "sprayer">("tractor");
  const [licensePlate, setLicensePlate] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [deviceSecret, setDeviceSecret] = useState("");
  const [description, setDescription] = useState("");

  const disabled = submit.isPending;

  return (
    <div className="pointer-events-auto h-full w-full p-6 overflow-y-auto bg-gradient-to-br from-amber-50 via-white to-emerald-50">
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
              <Tractor className="h-5 w-5 text-amber-700" />
              农机设备注册申请（人工审核）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>品牌</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择品牌" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_OPTIONS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tractor">拖拉机</SelectItem>
                    <SelectItem value="harvester">收割机</SelectItem>
                    <SelectItem value="seeder">播种机</SelectItem>
                    <SelectItem value="sprayer">植保机</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>型号</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="例如：7M2204 / Puma2104" />
            </div>

            <div className="space-y-2">
              <Label>车牌/机号（可选）</Label>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="可留空" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备ID（deviceId）</Label>
                <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="硬件侧唯一ID" />
              </div>
              <div className="space-y-2">
                <Label>设备密钥（deviceSecret，可选）</Label>
                <Input value={deviceSecret} onChange={(e) => setDeviceSecret(e.target.value)} placeholder="可先不填，后续管理员发放" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>补充说明（可选）</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px]" />
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
                onClick={() =>
                  submit.mutate({
                    brand,
                    model,
                    type,
                    licensePlate: licensePlate || undefined,
                    deviceId,
                    deviceSecret: deviceSecret || undefined,
                    description: description || undefined,
                  })
                }
              >
                提交设备审核
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              通过后设备将加入“正式机队”，并可接收硬件实时上报。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

