import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Key } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="space-y-6">
      <SectionHeader title="系统日志" description="审计登录活动与短信发送记录" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="login" className="gap-2">
            <Key className="w-4 h-4" />
            登录日志
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <Mail className="w-4 h-4" />
            短信日志
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <LoginLogsTable />
        </TabsContent>

        <TabsContent value="sms">
          <SmsLogsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoginLogsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.admin.logs.login.useQuery({
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>登录方式</TableHead>
              <TableHead>IP地址</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
            ) : data?.list.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">暂无数据</TableCell></TableRow>
            ) : (
              data?.list.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.userId || "-"}</TableCell>
                  <TableCell>{log.loginMethod}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "outline" : "destructive"}>
                      {log.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* 分页略 */}
    </div>
  );
}

function SmsLogsTable() {
  const [page, setPage] = useState(1);
  const [phone, setPhone] = useState("");
  const [inputValue, setInputValue] = useState("");

  const { data, isLoading } = trpc.admin.logs.sms.useQuery({
    page,
    pageSize: 20,
    phone: phone || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 w-full sm:w-64">
        <Input 
          placeholder="搜索手机号..." 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setPhone(inputValue)}
        />
        <Button variant="secondary" onClick={() => setPhone(inputValue)}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>场景</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
            ) : data?.list.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">暂无数据</TableCell></TableRow>
            ) : (
              data?.list.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.phone}</TableCell>
                  <TableCell>{log.scene}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "outline" : "destructive"}>
                      {log.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.error || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
