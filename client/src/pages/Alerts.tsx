import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Info, Search, XCircle } from "lucide-react";

// Mock data for alerts
const initialAlerts = [
  { id: "AL-2025001", machine: "JD-8R-2025", code: "E001", severity: "critical", message: "发动机油压过低", time: "2025-05-20 10:30:00", status: "active" },
  { id: "AL-2025002", machine: "JD-S780-001", code: "W005", severity: "warning", message: "液压油温过高", time: "2025-05-20 09:15:00", status: "active" },
  { id: "AL-2025003", machine: "JD-8R-2025", code: "I003", severity: "info", message: "保养即将到期", time: "2025-05-19 16:45:00", status: "resolved" },
  { id: "AL-2025004", machine: "JD-CP690-002", code: "E002", severity: "critical", message: "变速箱故障", time: "2025-05-18 14:20:00", status: "resolved" },
  { id: "AL-2025005", machine: "JD-S780-001", code: "W008", severity: "warning", message: "燃油滤清器需更换", time: "2025-05-18 08:00:00", status: "resolved" },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesSearch = alert.machine.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          alert.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> 严重</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 警告</Badge>;
      case "info":
        return <Badge variant="outline" className="text-blue-600 border-blue-200 flex items-center gap-1"><Info className="h-3 w-3" /> 提示</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">报警中心</h2>
          <p className="text-muted-foreground">实时监控设备故障与异常状态</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">导出记录</Button>
          <Button>全部标记已读</Button>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="搜索设备号、故障代码或内容..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="报警等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="info">提示</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead>
                  <TableHead>报警等级</TableHead>
                  <TableHead>设备编号</TableHead>
                  <TableHead>故障代码</TableHead>
                  <TableHead>报警内容</TableHead>
                  <TableHead>发生时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className="group">
                      <TableCell>
                        {alert.status === "active" ? (
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="未处理" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="font-medium">{alert.machine}</TableCell>
                      <TableCell className="font-mono text-xs">{alert.code}</TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{alert.time}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">详情</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      没有找到相关报警记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
