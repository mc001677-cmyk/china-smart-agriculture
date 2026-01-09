import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Map as MapIcon, Sprout, Ruler, Activity, Droplets } from "lucide-react";
import { useField, Field } from "@/contexts/FieldContext";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface FieldDetailPanelProps {
  fieldId: number;
  onClose: () => void;
}

// Reusing the CircularGauge from MachineDetailPanel for consistency
const CircularGauge = ({ value, max = 100, color, label, subLabel }: { value: number, max?: number, color: string, label: string, subLabel: string }) => {
  const data = [{ value: value, fill: color }];
  
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white/40 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
      <div className="h-24 w-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={8} 
            data={data} 
            startAngle={90} 
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, max]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight text-gray-900">{value}</span>
          <span className="text-[10px] text-gray-500 uppercase font-medium">{subLabel}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 mt-1">{label}</span>
    </div>
  );
};

const DataCard = ({ label, value, unit, icon: Icon }: { label: string, value: string, unit?: string, icon?: any }) => (
  <div className="flex flex-col p-3 bg-white/40 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm hover:bg-white/60 transition-colors">
    <div className="flex items-center gap-2 mb-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-semibold text-gray-900 tracking-tight">{value}</span>
      {unit && <span className="text-xs text-gray-500 font-medium">{unit}</span>}
    </div>
  </div>
);

export default function FieldDetailPanel({ fieldId, onClose }: FieldDetailPanelProps) {
  const { fields } = useField();
  const field = fields.find((f: Field) => f.id === fieldId);

  if (!field) return null;

  // Mock data for demonstration - in a real app, this would come from the backend or context
  const mockData = {
    progress: Math.floor(Math.random() * 40) + 30, // 30-70%
    avgYield: field.crop === '玉米' ? 950 : (field.crop === '水稻' ? 600 : 200),
    avgMoisture: field.crop === '玉米' ? 24 : (field.crop === '水稻' ? 15 : 13),
    harvestedArea: (field.area * 0.45).toFixed(1),
  };

  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-2xl border-l border-white/20 shadow-2xl animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="pt-8 pb-4 px-6 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{field.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100/50 text-green-700 border border-green-200/50">
              {field.crop}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 text-gray-600 border border-black/5">
              {field.area} 亩
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 text-gray-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          
          {/* Progress Section */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-3xl border border-green-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">作业进度</h3>
              <span className="text-xs font-medium text-green-600 bg-white/50 px-2 py-1 rounded-full">进行中</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 relative shrink-0">
                 <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    innerRadius="70%" 
                    outerRadius="100%" 
                    barSize={8} 
                    data={[{ value: mockData.progress, fill: '#10b981' }]} 
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-green-700">{mockData.progress}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">已收割面积</div>
                <div className="text-2xl font-bold text-gray-900">{mockData.harvestedArea} <span className="text-sm font-normal text-gray-500">亩</span></div>
                <div className="text-xs text-gray-400">预计剩余 4.5 小时</div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">农艺指标</h3>
            <div className="grid grid-cols-2 gap-3">
              <DataCard label="平均产量" value={mockData.avgYield.toString()} unit="kg/亩" icon={Activity} />
              <DataCard label="平均水分" value={mockData.avgMoisture.toString()} unit="%" icon={Droplets} />
              <DataCard label="地块周长" value={(Math.sqrt(field.area * 666.67) * 4).toFixed(0)} unit="m" icon={Ruler} />
              <DataCard label="作物长势" value="良好" icon={Sprout} />
            </div>
          </div>

          {/* Map Preview Placeholder */}
          <div className="aspect-video rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-[url('/images/field-pattern.png')] opacity-10 bg-repeat"></div>
             <div className="text-center z-10">
               <MapIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
               <span className="text-xs text-gray-400 font-medium">地块边界预览</span>
             </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
