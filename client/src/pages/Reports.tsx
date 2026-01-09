import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const weeklyData = [
  { name: '周一', 作业面积: 400, 油耗: 240, 效率: 85 },
  { name: '周二', 作业面积: 300, 油耗: 139, 效率: 88 },
  { name: '周三', 作业面积: 200, 油耗: 980, 效率: 75 },
  { name: '周四', 作业面积: 278, 油耗: 390, 效率: 90 },
  { name: '周五', 作业面积: 189, 油耗: 480, 效率: 82 },
  { name: '周六', 作业面积: 239, 油耗: 380, 效率: 95 },
  { name: '周日', 作业面积: 349, 油耗: 430, 效率: 92 },
];

const statusData = [
  { name: '作业中', value: 5, color: '#4CAF50' },
  { name: '怠速', value: 2, color: '#FFC107' },
  { name: '移动', value: 3, color: '#2196F3' },
  { name: '关机', value: 1, color: '#9E9E9E' },
  { name: '掉线', value: 1, color: '#F44336' },
];

export default function Reports() {
  return (
    <div className="h-full p-4 pointer-events-auto overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-md flex items-center gap-2">
          <BarChart3 className="h-8 w-8" /> 数据报表中心
        </h2>
        <Button variant="secondary">
          <Download className="h-4 w-4 mr-2" /> 导出本周报告
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Bar Chart */}
        <Card className="bg-white/95 backdrop-blur shadow-lg border-none">
          <CardHeader>
            <CardTitle>周作业量与油耗对比</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#4CAF50" />
                <YAxis yAxisId="right" orientation="right" stroke="#FFC107" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="作业面积" fill="#4CAF50" name="作业面积 (亩)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="油耗" fill="#FFC107" name="油耗 (L)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Key Metrics */}
        <Card className="bg-white/95 backdrop-blur shadow-lg border-none">
          <CardHeader>
            <CardTitle>关键指标概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">本周总作业面积</p>
                <p className="text-3xl font-bold text-green-600">1,955 <span className="text-sm font-normal">亩</span></p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">本周总油耗</p>
                <p className="text-3xl font-bold text-yellow-600">3,039 <span className="text-sm font-normal">L</span></p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">平均作业效率</p>
                <p className="text-3xl font-bold text-blue-600">45.2 <span className="text-sm font-normal">亩/小时</span></p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">设备出勤率</p>
                <p className="text-3xl font-bold text-purple-600">92%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Line Chart */}
        <Card className="bg-white/95 backdrop-blur shadow-lg border-none">
          <CardHeader>
            <CardTitle>作业效率趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="效率" stroke="#2196F3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name="综合效率评分" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Pie Chart */}
        <Card className="bg-white/95 backdrop-blur shadow-lg border-none">
          <CardHeader>
            <CardTitle>设备状态分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
