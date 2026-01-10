import React, { useMemo, useState } from "react";
import { sampleMachineListings } from "@/data/equipmentMarketData";
import type { MachineCategory, MachineListing } from "@/types/equipmentMarket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tractor, Search, MapPin, BadgeDollarSign, Phone, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const CATEGORY_LABELS: { key: MachineCategory | "全部"; label: string }[] = [
  { key: "全部", label: "全部" },
  { key: "拖拉机", label: "拖拉机" },
  { key: "联合收割机", label: "联合收割机" },
  { key: "播种机", label: "播种机" },
  { key: "施肥机", label: "施肥机" },
  { key: "植保喷药机", label: "植保喷药机" },
  { key: "植保无人机", label: "植保无人机" },
  { key: "插秧机", label: "插秧机" },
  { key: "打捆机", label: "打捆机" },
  { key: "农机具", label: "农机具" },
  { key: "其他", label: "其他" },
];

const STATUS_COLOR: Record<string, string> = {
  在售: "bg-emerald-50 text-emerald-700 border-emerald-200",
  已预订: "bg-amber-50 text-amber-700 border-amber-200",
  已成交: "bg-blue-50 text-blue-700 border-blue-200",
  已下架: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function MachineMarket() {
  const [location, navigate] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !isSimulateMode });
  const { data: membership } = trpc.membership.summary.useQuery(undefined, { enabled: !isSimulateMode });
  
  const canPublish = isSimulateMode || (membership?.isActive);
  const { data: approvedListings } = trpc.machineListings.listApproved.useQuery(undefined, { enabled: !isSimulateMode });
  const [activeCategory, setActiveCategory] = useState<MachineCategory | "全部">("全部");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    let list: any[] = isSimulateMode ? sampleMachineListings : (approvedListings ?? []);
    if (activeCategory !== "全部") {
      list = list.filter(item => item.category === activeCategory);
    }
    if (keyword.trim()) {
      const kw = keyword.trim();
      list = list.filter(item =>
        String(item.title ?? "").includes(kw) ||
        String(item.brand ?? "").includes(kw) ||
        String(item.model ?? "").includes(kw) ||
        String(item.location ?? "").includes(kw)
      );
    }
    return list;
  }, [activeCategory, keyword, isSimulateMode, approvedListings]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto bg-gradient-to-b from-slate-900/60 to-slate-950/80">
      <div className="h-full flex flex-col max-w-6xl mx-auto px-4 py-4">
        {/* 顶部标题区 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-100 text-xs mb-2">
              <Tractor className="w-3 h-3" />
              <span>农业机械交易频道</span>
            </div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              全品类农机设备 · 一站式挂牌与选购
            </h1>
            <p className="text-sm text-slate-200/80 mt-1">
              支持拖拉机、收割机、插秧机、植保机、农机具等多类设备挂牌与查找，方便合作社、机手与经销商快速对接。
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!canPublish) {
                  navigate("/dashboard/membership");
                  return;
                }
                navigate("/dashboard/publish-machine");
              }}
            >
              发布二手农机
            </Button>
          </div>
        </div>

        {/* 免责声明与规则提示 */}
        <div className="mb-4 glass-card bg-amber-500/10 border-amber-500/30 p-3 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-100/90">
              <span className="font-bold text-amber-400">规则提示：</span>
              二手机联系方式对所有注册用户开放。请自行甄别风险，平台不对线下交易结果负责。
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] text-emerald-400 font-medium uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            安全交易保障
          </div>
        </div>

        {/* 筛选区 */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <Tabs
            value={activeCategory}
            onValueChange={(val) => setActiveCategory(val as MachineCategory | "全部")}
            className="w-full md:w-auto"
          >
            <ScrollArea className="w-full md:w-[640px]">
              <TabsList className="inline-flex h-auto flex-nowrap gap-1 bg-slate-900/30 border border-slate-700 rounded-full p-1">
                {CATEGORY_LABELS.map(cat => (
                  <TabsTrigger
                    key={cat.key}
                    value={cat.key}
                    className="px-3 py-1.5 rounded-full text-xs md:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </Tabs>

          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="按品牌 / 型号 / 地区搜索..."
                className="pl-9 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-100 hover:bg-slate-800/80"
              onClick={() => setKeyword("")}
            >
              重置
            </Button>
          </div>
        </div>

        {/* 列表区 */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-2">
            {filtered.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">
                暂无符合条件的挂牌设备。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                {filtered.map(item => (
                  <Card
                    key={item.id}
                    className="bg-slate-900/70 border-slate-700/80 shadow-lg shadow-black/40 hover:border-emerald-400/70 transition"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base text-slate-50 flex flex-wrap items-center gap-2">
                            {item.title}
                            {item.isFeatured && (
                              <Badge className="bg-emerald-500 text-white border-none text-[10px]">
                                推荐
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-300 mt-1">
                            {item.brand} · {item.model} · {item.year ? `${item.year} 年` : "年份未填"}
                          </CardDescription>
                        </div>
                        <Badge
                          className={STATUS_COLOR[item.status] || "bg-slate-700 text-slate-100 border-slate-600"}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-200">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                        {item.hoursUsed != null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            已工作 {item.hoursUsed} 小时
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-200/90 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-end justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                            <BadgeDollarSign className="w-4 h-4" />
                            {item.price ? `¥${item.price.toLocaleString()}` : "价格面议"}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            卖家：{item.sellerName}（{item.sellerType}）
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1"
                            onClick={() => {
                              window.open(`tel:${item.contactPhone}`, "_self");
                            }}
                          >
                            <Phone className="w-3 h-3" />
                            电话联系
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
