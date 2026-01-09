import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Plus } from "lucide-react";
import { useState } from "react";

export default function Planning() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="h-full flex gap-4 pointer-events-auto p-4">
      {/* Left: Calendar */}
      <Card className="w-[350px] bg-white/95 backdrop-blur shadow-lg border-none flex flex-col">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Layers className="h-5 w-5" /> 作业日历
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col items-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border shadow-sm bg-white"
          />
          <div className="mt-6 w-full">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" /> 创建新任务
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Task List */}
      <Card className="flex-1 bg-white/95 backdrop-blur shadow-lg border-none flex flex-col">
        <CardHeader className="border-b pb-4 bg-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle>今日任务 ({date?.toLocaleDateString()})</CardTitle>
            <div className="flex gap-2">
               <span className="text-sm text-gray-500">已完成: 0</span>
               <span className="text-sm text-gray-500">进行中: 0</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-gray-400">
           <div className="text-center">
             <p>今日暂无作业计划</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
