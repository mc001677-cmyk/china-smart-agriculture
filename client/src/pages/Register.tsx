import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Lock, Phone, User, Wheat } from "lucide-react";

export default function Register() {
  const [location, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("两次密码不一致");
      return;
    }
    setIsLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        const code = data?.error ? String(data.error) : "注册失败";
        setError(code === "already_registered" ? "该手机号已注册" : code);
        return;
      }
      setLocation("/dashboard/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff7e6] via-[#f7fbf7] to-white" />
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 min-h-screen flex flex-col">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-slate-700 hover:text-slate-900" onClick={() => setLocation("/login")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回登录
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-md flex items-center justify-center ring-1 ring-black/5">
              <Wheat className="h-5 w-5 text-[#1f6b3a]" />
            </div>
            <div className="leading-tight text-right">
              <div className="text-sm text-slate-600">China Smart Agriculture</div>
              <div className="text-base font-semibold tracking-tight text-slate-900">中国智慧农业平台</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center mt-8 md:mt-12">
          <Card className="w-full max-w-[460px] bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-2xl rounded-3xl">
            <CardHeader className="pb-0 pt-8 px-8">
              <h2 className="text-2xl font-bold text-slate-900">创建账户</h2>
              <p className="text-sm text-slate-600 mt-1">注册后完善身份与设备信息，等待人工审核开通发布权限</p>
            </CardHeader>

            <form onSubmit={submit}>
              <CardContent className="space-y-5 pt-6 px-8">
                {error && (
                  <div className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-[#1f6b3a]" /> 昵称/姓名
                  </Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#1f6b3a]" /> 手机号
                  </Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" required className="h-12 rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#1f6b3a]" /> 密码
                  </Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="h-12 rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#1f6b3a]" /> 确认密码
                  </Label>
                  <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required className="h-12 rounded-2xl" />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pb-8 pt-2 px-8">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold shadow-lg shadow-amber-900/10 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? "注册中..." : <>
                    注册并进入审核中心 <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>}
                </Button>
                <div className="text-center text-xs text-slate-500 leading-relaxed">
                  注册即代表你同意我们的使用条款与隐私政策
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

