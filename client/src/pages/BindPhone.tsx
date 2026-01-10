import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { APPLE_DESIGN, cn } from "@/lib/utils";
import { getDefaultPostAuthPath, parseNextFromSearch } from "@/lib/authPaths";

export default function BindPhone() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const next = parseNextFromSearch(search);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const sendCode = async () => {
    if (!phone.match(/^1[3-9]\d{9}$/)) {
      toast.error("请输入正确的手机号");
      return;
    }
    setIsSending(true);
    try {
      const r = await fetch("/api/auth/sendSmsCode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, scene: "bindPhone" }),
      });
      const data = await r.json();
      if (data.ok) {
        toast.success("验证码已发送" + (data.data.mockCode ? ` (测试码: ${data.data.mockCode})` : ""));
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.error || "发送失败");
      }
    } catch (err) {
      toast.error("发送失败，请稍后再试");
    } finally {
      setIsSending(false);
    }
  };

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("请输入6位验证码");
      return;
    }
    setIsLoading(true);
    try {
      const r = await fetch("/api/auth/bindPhone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (data.ok) {
        toast.success("手机号绑定成功");
        setLocation(getDefaultPostAuthPath(next, ""));
      } else {
        toast.error(data.error || "绑定失败");
      }
    } catch (err) {
      toast.error("绑定失败，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className={cn("w-full max-w-md", APPLE_DESIGN.radius.xl, APPLE_DESIGN.shadow.lg)}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">绑定手机号</CardTitle>
          <CardDescription>为了您的账户安全，请绑定手机号以继续使用平台功能</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBind} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#1f6b3a]" /> 手机号
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="请输入手机号" 
                  required 
                  className={cn("h-12", APPLE_DESIGN.radius.lg)} 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={sendCode} 
                  disabled={isSending || countdown > 0}
                  className={cn("h-12 px-4 whitespace-nowrap", APPLE_DESIGN.radius.lg)}
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1f6b3a]" /> 验证码
              </Label>
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="请输入6位验证码" 
                required 
                className={cn("h-12", APPLE_DESIGN.radius.lg)} 
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold",
                APPLE_DESIGN.radius.lg,
                APPLE_DESIGN.shadow.md
              )}
            >
              {isLoading ? "正在绑定..." : (
                <span className="flex items-center justify-center gap-2">
                  确认绑定 <ChevronRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
