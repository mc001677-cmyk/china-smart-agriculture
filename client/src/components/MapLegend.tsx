import { useState } from "react";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MapLegend() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language, t } = useLanguage();

  const statusItems = [
    { label: t.sidebar.working, color: "bg-green-500" },
    { label: t.sidebar.idle, color: "bg-yellow-500" },
    { label: t.sidebar.moving, color: "bg-blue-500" },
    { label: t.sidebar.offline, color: "bg-gray-400" },
  ];

  const fieldItems = [
    { label: t.map.corn, color: "bg-orange-500" },
    { label: t.map.soybean, color: "bg-cyan-500" },
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      {/* 图例面板 - 乔布斯风格 */}
      {isExpanded && (
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-2xl shadow-black/10 border border-white/50 p-4 min-w-[180px]">
          <h4 className="text-[11px] font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            {t.map.machineStatus}
          </h4>
          <div className="space-y-2">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
          
          <div className="h-px bg-gray-200/50 my-3" />
          
          <h4 className="text-[11px] font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            {t.map.fieldType}
          </h4>
          <div className="space-y-2">
            {fieldItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图例切换按钮 - 乔布斯风格 */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="backdrop-blur-xl bg-white/80 shadow-2xl shadow-black/10 hover:bg-white/90 text-sm font-medium h-10 px-4 rounded-2xl border border-white/50 text-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Layers className="h-4 w-4 mr-2 text-gray-500" />
        {t.map.legend}
        {isExpanded ? <ChevronDown className="h-4 w-4 ml-2 text-gray-400" /> : <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />}
      </Button>
    </div>
  );
}
