import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertTriangle, Battery, ChevronDown, Filter, Fuel, Gauge, MapPin, Search, Signal, Tractor } from "lucide-react";
import { useState } from "react";
import { useFleet } from "@/contexts/FleetContext";
import MachineDetailPanel from "@/components/MachineDetailPanel";



const statusColors = {
  working: "bg-[#4CAF50]", // Green
  power_on: "bg-[#FFC107]", // Amber
  idle: "bg-[#FF9800]", // Orange
  moving: "bg-[#2196F3]", // Blue
  off: "bg-[#616161]", // Grey 700
  offline: "bg-[#9E9E9E]", // Grey 500
};

const statusLabels = {
  working: "工作",
  power_on: "上电",
  idle: "怠速",
  moving: "移动",
  off: "关机",
  offline: "掉线",
};

export default function Fleet() {
  const { fleet, activeMachineId, setActiveMachineId } = useFleet();
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState("all");

  const handleMachineClick = (id: number) => {
    setActiveMachineId(id);
    setShowDetail(true);
  };

  // Filter logic
  const filteredFleet = fleet.filter(device => {
    if (filter === "all") return true;
    // Add more filter logic here if needed
    return true;
  });

  return (
    <div className="flex h-full pointer-events-none relative">
      {/* Detail Panel Overlay (Right Side) */}
      {showDetail && activeMachineId && (
        <div className="absolute top-4 right-4 bottom-4 z-50 pointer-events-auto w-80 shadow-2xl rounded-xl overflow-hidden border border-white/20">
           <MachineDetailPanel machineId={activeMachineId} onClose={() => setShowDetail(false)} />
        </div>
      )}
      {/* Left Sidebar Panel (Hidden in Overview Mode) */}
      <div className="hidden w-[400px] flex-col bg-white/95 backdrop-blur shadow-2xl h-full pointer-events-auto border-r border-gray-200 md:flex">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Tractor className="h-6 w-6" /> 机队管理
            </h2>
            <Button variant="ghost" size="icon">
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </Button>
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 whitespace-nowrap">我的关注</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 whitespace-nowrap flex items-center gap-1">
              工作状态 <ChevronDown className="h-3 w-3" />
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">燃油/DEF不足</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">故障</Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full ml-auto">
              <Filter className="h-4 w-4 text-gray-500" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="机号/设备名称/客户名称" 
              className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{filteredFleet.length}/{fleet.length} 设备</span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
              <span>发动机负载</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Device List */}
        <ScrollArea className="flex-1 bg-gray-50/50">
          <div className="p-2 space-y-2">
            {filteredFleet.map((device) => (
              <Card 
                key={device.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-l-4",
                  activeMachineId === device.id ? "border-l-primary ring-1 ring-primary/20 bg-white" : "border-l-transparent bg-white",
                  device.status === 'offline' && "opacity-70"
                )}
                onClick={() => handleMachineClick(device.id)}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* Device Image Placeholder */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center relative shrink-0 overflow-hidden border border-gray-200">
                      <Tractor className="h-10 w-10 text-gray-400" />
                      {device.warning && (
                        <div className="absolute top-0 left-0 bg-yellow-400 text-white p-0.5 rounded-br">
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", statusColors[device.status as keyof typeof statusColors])}></div>
                        <span className="text-xs font-medium text-gray-600 truncate">{device.statusText}</span>
                      </div>
                      
                      <h3 className="font-bold text-gray-900 truncate">{device.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mb-2 truncate">{device.serial}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Fuel className="h-3 w-3 text-gray-400" />
                            <span>{device.fuel}%</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Battery className="h-3 w-3 text-gray-400" />
                            <span>{device.def}%</span>
                          </div>
                        </div>
                        
                        {device.status !== 'off' && device.status !== 'offline' && (
                          <div className="text-sm font-bold text-gray-900">
                            {device.load}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Map Legend (Floating Bottom Left) */}
      <div className="absolute bottom-6 left-[420px] bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg pointer-events-auto border border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">图例</h4>
        <div className="space-y-1.5">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-sm", statusColors[key as keyof typeof statusColors])}></div>
              <span className="text-xs text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
