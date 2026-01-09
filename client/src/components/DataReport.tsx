import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";

const yieldData = [
  { name: "9月15日", current: 850, lastMonth: 0, lastYear: 820 },
  { name: "9月16日", current: 920, lastMonth: 0, lastYear: 880 },
  { name: "9月17日", current: 890, lastMonth: 0, lastYear: 850 },
  { name: "9月18日", current: 950, lastMonth: 0, lastYear: 910 },
  { name: "9月19日", current: 980, lastMonth: 0, lastYear: 930 },
];

const efficiencyData = [
  { name: "9月15日", current: 92, lastMonth: 0, lastYear: 88 },
  { name: "9月16日", current: 95, lastMonth: 0, lastYear: 90 },
  { name: "9月17日", current: 88, lastMonth: 0, lastYear: 85 },
  { name: "9月18日", current: 96, lastMonth: 0, lastYear: 92 },
  { name: "9月19日", current: 98, lastMonth: 0, lastYear: 94 },
];

export default function DataReport() {
  return (
    <div className="absolute top-20 right-6 z-30 w-[400px] pointer-events-auto">
      <Card className="bg-white/95 backdrop-blur-xl shadow-2xl border-white/50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            历史数据对比
          </h3>
          <div className="text-xs text-gray-400">2025秋收季</div>
        </div>
        
        <div className="p-4">
          <Tabs defaultValue="yield" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="yield">亩产对比</TabsTrigger>
              <TabsTrigger value="efficiency">效率对比</TabsTrigger>
            </TabsList>
            
            <TabsContent value="yield" className="mt-0">
              <div className="h-[200px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yieldData} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                    <Bar dataKey="current" name="今年" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lastYear" name="去年同期" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex items-center justify-between bg-blue-50 rounded-xl p-3">
                <div>
                  <div className="text-xs text-gray-500">平均亩产</div>
                  <div className="text-xl font-bold text-blue-700">918 <span className="text-xs font-normal">kg/亩</span></div>
                </div>
                <div className="flex items-center gap-1 text-green-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="font-bold text-sm">+4.2%</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="efficiency" className="mt-0">
              <div className="h-[200px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyData} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                    <Bar dataKey="current" name="今年" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lastYear" name="去年同期" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex items-center justify-between bg-green-50 rounded-xl p-3">
                <div>
                  <div className="text-xs text-gray-500">平均效率</div>
                  <div className="text-xl font-bold text-green-700">94.5 <span className="text-xs font-normal">%</span></div>
                </div>
                <div className="flex items-center gap-1 text-green-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="font-bold text-sm">+2.8%</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
