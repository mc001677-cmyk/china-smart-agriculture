/**
 * Admin 系统配置页面
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save,
  Settings,
  CreditCard,
  MessageSquare,
  Shield,
  RefreshCw,
  Crown,
  Gem,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("membership");
  
  // 获取系统配置
  const { data: settings, isLoading, refetch } = trpc.admin.settings.list.useQuery();
  
  // 更新配置
  const updateMutation = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      toast.success("配置已保存");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // 本地表单状态
  const [membershipConfig, setMembershipConfig] = useState({
    silverPrice: "66",
    goldPrice: "199",
    diamondPrice: "999",
    silverDuration: "365",
    goldDuration: "365",
    diamondDuration: "365",
  });

  const [smsConfig, setSmsConfig] = useState({
    smsEnabled: true,
    smsProvider: "mock",
    smsRateLimit: "60",
    smsCodeExpiry: "300",
  });

  const [securityConfig, setSecurityConfig] = useState({
    maxLoginAttempts: "5",
    lockoutDuration: "1800",
    sessionTimeout: "86400",
    requirePhoneVerification: true,
  });

  // 初始化表单
  useEffect(() => {
    if (settings) {
      const getVal = (key: string, defaultVal: string) => 
        settings.find(s => s.key === key)?.value || defaultVal;
      
      setMembershipConfig({
        silverPrice: getVal("membership.silver.price", "66"),
        goldPrice: getVal("membership.gold.price", "199"),
        diamondPrice: getVal("membership.diamond.price", "999"),
        silverDuration: getVal("membership.silver.duration", "365"),
        goldDuration: getVal("membership.gold.duration", "365"),
        diamondDuration: getVal("membership.diamond.duration", "365"),
      });

      setSmsConfig({
        smsEnabled: getVal("sms.enabled", "true") === "true",
        smsProvider: getVal("sms.provider", "mock"),
        smsRateLimit: getVal("sms.rate_limit", "60"),
        smsCodeExpiry: getVal("sms.code_expiry", "300"),
      });

      setSecurityConfig({
        maxLoginAttempts: getVal("security.max_login_attempts", "5"),
        lockoutDuration: getVal("security.lockout_duration", "1800"),
        sessionTimeout: getVal("security.session_timeout", "86400"),
        requirePhoneVerification: getVal("security.require_phone_verification", "true") === "true",
      });
    }
  }, [settings]);

  const saveMembershipConfig = () => {
    updateMutation.mutate({
      settings: [
        { key: "membership.silver.price", value: membershipConfig.silverPrice },
        { key: "membership.gold.price", value: membershipConfig.goldPrice },
        { key: "membership.diamond.price", value: membershipConfig.diamondPrice },
        { key: "membership.silver.duration", value: membershipConfig.silverDuration },
        { key: "membership.gold.duration", value: membershipConfig.goldDuration },
        { key: "membership.diamond.duration", value: membershipConfig.diamondDuration },
      ],
    });
  };

  const saveSmsConfig = () => {
    updateMutation.mutate({
      settings: [
        { key: "sms.enabled", value: String(smsConfig.smsEnabled) },
        { key: "sms.provider", value: smsConfig.smsProvider },
        { key: "sms.rate_limit", value: smsConfig.smsRateLimit },
        { key: "sms.code_expiry", value: smsConfig.smsCodeExpiry },
      ],
    });
  };

  const saveSecurityConfig = () => {
    updateMutation.mutate({
      settings: [
        { key: "security.max_login_attempts", value: securityConfig.maxLoginAttempts },
        { key: "security.lockout_duration", value: securityConfig.lockoutDuration },
        { key: "security.session_timeout", value: securityConfig.sessionTimeout },
        { key: "security.require_phone_verification", value: String(securityConfig.requirePhoneVerification) },
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">系统配置</h1>
          <p className="text-slate-500 mt-1">管理平台核心配置参数</p>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">系统配置</h1>
        <p className="text-slate-500 mt-1">管理平台核心配置参数</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="membership" className="gap-2">
            <CreditCard className="w-4 h-4" />
            会员配置
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            短信配置
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            安全配置
          </TabsTrigger>
        </TabsList>

        {/* 会员配置 */}
        <TabsContent value="membership">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-600" />
                会员价格与时长配置
              </CardTitle>
              <CardDescription>设置各等级会员的价格和有效期</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 白银会员 */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">白银会员</h4>
                    <p className="text-sm text-slate-500">基础会员权益</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>价格 (元)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.silverPrice}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, silverPrice: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>有效期 (天)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.silverDuration}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, silverDuration: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 黄金会员 */}
              <div className="p-4 bg-amber-50 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center">
                    <Gem className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">黄金会员</h4>
                    <p className="text-sm text-slate-500">高级会员权益</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>价格 (元)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.goldPrice}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, goldPrice: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>有效期 (天)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.goldDuration}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, goldDuration: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 钻石伙伴 */}
              <div className="p-4 bg-violet-50 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-200 to-purple-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">钻石伙伴</h4>
                    <p className="text-sm text-slate-500">企业级权益</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>价格 (元)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.diamondPrice}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, diamondPrice: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>有效期 (天)</Label>
                    <Input
                      type="number"
                      value={membershipConfig.diamondDuration}
                      onChange={(e) => setMembershipConfig(c => ({ ...c, diamondDuration: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveMembershipConfig} disabled={updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                保存会员配置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 短信配置 */}
        <TabsContent value="sms">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                短信服务配置
              </CardTitle>
              <CardDescription>配置短信验证码发送参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <h4 className="font-medium">启用短信服务</h4>
                  <p className="text-sm text-slate-500">关闭后将使用 Mock 模式</p>
                </div>
                <Switch
                  checked={smsConfig.smsEnabled}
                  onCheckedChange={(checked) => setSmsConfig(c => ({ ...c, smsEnabled: checked }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>服务商</Label>
                  <Input
                    value={smsConfig.smsProvider}
                    onChange={(e) => setSmsConfig(c => ({ ...c, smsProvider: e.target.value }))}
                    placeholder="aliyun / tencent / mock"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>发送间隔 (秒)</Label>
                  <Input
                    type="number"
                    value={smsConfig.smsRateLimit}
                    onChange={(e) => setSmsConfig(c => ({ ...c, smsRateLimit: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>验证码有效期 (秒)</Label>
                  <Input
                    type="number"
                    value={smsConfig.smsCodeExpiry}
                    onChange={(e) => setSmsConfig(c => ({ ...c, smsCodeExpiry: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={saveSmsConfig} disabled={updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                保存短信配置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全配置 */}
        <TabsContent value="security">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                安全策略配置
              </CardTitle>
              <CardDescription>配置登录安全和账号保护策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <h4 className="font-medium">强制手机号验证</h4>
                  <p className="text-sm text-slate-500">新用户必须验证手机号</p>
                </div>
                <Switch
                  checked={securityConfig.requirePhoneVerification}
                  onCheckedChange={(checked) => setSecurityConfig(c => ({ ...c, requirePhoneVerification: checked }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>最大登录尝试次数</Label>
                  <Input
                    type="number"
                    value={securityConfig.maxLoginAttempts}
                    onChange={(e) => setSecurityConfig(c => ({ ...c, maxLoginAttempts: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>账号锁定时长 (秒)</Label>
                  <Input
                    type="number"
                    value={securityConfig.lockoutDuration}
                    onChange={(e) => setSecurityConfig(c => ({ ...c, lockoutDuration: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>会话超时时间 (秒)</Label>
                  <Input
                    type="number"
                    value={securityConfig.sessionTimeout}
                    onChange={(e) => setSecurityConfig(c => ({ ...c, sessionTimeout: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={saveSecurityConfig} disabled={updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                保存安全配置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
