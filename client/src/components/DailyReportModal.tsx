import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle2, Droplets, Fuel, Gauge, Sprout, Tractor } from "lucide-react";

interface DailyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyReportModal({ open, onOpenChange }: DailyReportModalProps) {
  // Mock Data for Autumn Harvest Daily Report
  const reportDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const summary = {
    totalArea: 1250.5, // mu
    totalYield: 985.2, // tons
    avgYield: 788, // kg/mu
    avgMoisture: 14.6, // %
    totalFuel: 450.2, // L
    workingHours: 42.5, // hours (fleet total)
    efficiency: 29.4, // mu/h
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-bold text-sm uppercase tracking-wider">作业完成</span>
          </div>
          <DialogTitle className="text-2xl font-bold">作业日报 - {reportDate}</DialogTitle>
          <DialogDescription>
            黑龙江建三江秋收作业项目组 • 玉米收割
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Sprout className="h-5 w-5" />
                <span className="font-medium">今日作业面积</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{summary.totalArea}</span>
                <span className="text-sm text-gray-500">亩</span>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <Tractor className="h-5 w-5" />
                <span className="font-medium">收获总产量</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{summary.totalYield}</span>
                <span className="text-sm text-gray-500">吨</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detailed Stats */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">作业质量分析</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Gauge className="h-3.5 w-3.5" />
                  平均亩产
                </div>
                <div className="text-xl font-bold">{summary.avgYield} <span className="text-xs font-normal text-gray-400">kg</span></div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Droplets className="h-3.5 w-3.5" />
                  平均水分
                </div>
                <div className="text-xl font-bold">{summary.avgMoisture}%</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  作业效率
                </div>
                <div className="text-xl font-bold">{summary.efficiency} <span className="text-xs font-normal text-gray-400">亩/h</span></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Fuel className="h-4 w-4 text-gray-500" />
              机队消耗概览
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">机队总油耗</span>
              <span className="font-mono font-medium">{summary.totalFuel} L</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">总工作时长</span>
              <span className="font-mono font-medium">{summary.workingHours} 小时</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">平均油耗</span>
              <span className="font-mono font-medium">{(summary.totalFuel / summary.totalArea).toFixed(2)} L/亩</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button className="bg-primary hover:bg-primary/90">确认并存档</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
