import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";

const formSchema = z.object({
  membership_silver_price: z.string().min(1),
  membership_gold_price: z.string().min(1),
  sms_enabled: z.boolean(),
  sms_provider: z.string(),
});

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.settings.list.useQuery();
  const updateSettings = trpc.admin.settings.update.useMutation();
  const initDefaults = trpc.admin.settings.initDefaults.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membership_silver_price: "66",
      membership_gold_price: "199",
      sms_enabled: false,
      sms_provider: "MOCK",
    },
  });

  // Load data into form when fetched
  useEffect(() => {
    if (settings) {
      const map: Record<string, any> = {};
      settings.forEach(s => {
        if (s.key === "sms_enabled") map[s.key] = s.value === "true";
        else map[s.key] = s.value;
      });
      form.reset({
        membership_silver_price: map["membership_silver_price"] || "66",
        membership_gold_price: map["membership_gold_price"] || "199",
        sms_enabled: map["sms_enabled"] === true,
        sms_provider: map["sms_provider"] || "MOCK",
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateSettings.mutateAsync({
        settings: [
          { key: "membership_silver_price", value: values.membership_silver_price, category: "membership" },
          { key: "membership_gold_price", value: values.membership_gold_price, category: "membership" },
          { key: "sms_enabled", value: String(values.sms_enabled), category: "sms" },
          { key: "sms_provider", value: values.sms_provider, category: "sms" },
        ]
      });
      toast.success("系统配置已保存", { description: "部分配置可能需要重启服务才能完全生效" });
      utils.admin.settings.list.invalidate();
    } catch (e: any) {
      toast.error("保存失败", { description: e.message });
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        title="系统设置"
        description="调整系统参数与服务开关"
        right={
          <Button
            variant="outline"
            disabled={initDefaults.isPending}
            onClick={async () => {
              try {
                await initDefaults.mutateAsync();
                toast.success("已初始化默认配置");
                utils.admin.settings.list.invalidate();
              } catch (e: any) {
                toast.error("初始化失败", { description: e.message });
              }
            }}
          >
            {initDefaults.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            初始化默认配置
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
          <Card>
            <CardHeader>
                <CardTitle>会员定价</CardTitle>
                <CardDescription>设置不同等级会员的订阅价格（单位：元/年）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="membership_silver_price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>白银会员价格</FormLabel>
                            <FormControl>
                                <Input {...field} type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="membership_gold_price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>黄金会员价格</FormLabel>
                            <FormControl>
                                <Input {...field} type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>第三方服务</CardTitle>
                <CardDescription>配置短信与支付网关</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="sms_enabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">启用真实短信发送</FormLabel>
                                <FormDescription>
                                    关闭时将使用 Console 打印验证码（Mock 模式），开启前请确保已配置密钥。
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sms_provider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>短信服务商代号</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="ALIYUN / TENCENT / MOCK" />
                            </FormControl>
                            <FormDescription>对应后端驱动名称，需重启生效</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                保存配置
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
