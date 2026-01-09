import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { Wheat, ChevronRight, User, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const brands = [
  { id: "john_deere", name: "John Deere", color: "#367C2B", image: "/images/machines/john_deere_harvester.jpg" },
  { id: "case_ih", name: "CASE IH", color: "#C8102E", image: "/images/machines/case_ih_harvester.jpg" },
  { id: "new_holland", name: "New Holland", color: "#005BBB", image: "/images/machines/new_holland_harvester.jpg" },
  { id: "claas", name: "CLAAS", color: "#00A651", image: "/images/machines/claas_harvester.jpg" },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        const code = data?.error ? String(data.error) : "登录失败";
        setError(code === "invalid_credentials" ? "账号或密码错误" : code);
        return;
      }
      setLocation("/dashboard/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans">
      {/* 背景：丰收季 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff7e6] via-[#f7fbf7] to-white" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[url('/images/login-bg.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/80" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_15%,rgba(245,178,49,0.25),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(34,197,94,0.18),transparent_55%)]" />
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 min-h-screen flex flex-col">
        {/* 顶栏 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-slate-700 hover:text-slate-900"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回首页
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

        {/* 主体 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-8 md:mt-12">
          {/* 左侧：品牌与价值 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-xl px-4 py-2 ring-1 ring-black/5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-semibold text-slate-700">正式运行 · 权限控制 · 数据可追溯</span>
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              丰收季运营指挥入口
            </h1>
            <p className="mt-4 text-slate-600 leading-relaxed max-w-xl">
              看得见全场 · 管得住机队 · 算得清效益 · 盘得活资源
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-xl">
              {brands.map((b) => (
                <div key={b.id} className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl ring-1 ring-black/5 shadow-md">
                  <img src={b.image} alt={b.name} className="h-24 w-full object-cover" loading="lazy" />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{b.name}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 右侧：登录卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="lg:col-span-6"
          >
            <Card className="w-full max-w-[460px] ml-auto bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-2xl rounded-3xl">
              <CardHeader className="pb-0 pt-8 px-8">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#1f6b3a] to-[#2ea44f] shadow-md flex items-center justify-center">
                    <Wheat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">登录系统</h2>
                    <p className="text-sm text-slate-600 mt-1">进入正式运行控制台</p>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-5 pt-6 px-8">
                  {error && (
                    <div className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-700 font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-[#1f6b3a]" /> 账号 / 手机号
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入手机号"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-12 bg-white/70 border-black/10 text-slate-900 focus:border-[#1f6b3a] focus:ring-[#1f6b3a] rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#1f6b3a]" /> 密码
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-white/70 border-black/10 text-slate-900 focus:border-[#1f6b3a] focus:ring-[#1f6b3a] rounded-2xl"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      className="text-sm text-[#1f6b3a] font-semibold hover:underline"
                      onClick={() => setLocation("/register")}
                    >
                      创建新账户
                    </button>
                    <a href="#" className="text-sm text-[#1f6b3a] font-semibold hover:underline">
                      忘记密码?
                    </a>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 pb-8 pt-2 px-8">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold shadow-lg shadow-amber-900/10 flex items-center justify-center gap-2 group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        登录中...
                      </span>
                    ) : (
                      <>
                        进入控制台 <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-xs text-slate-500 leading-relaxed">
                    登录即代表您同意我们的 <a href="#" className="text-slate-700 underline">使用条款</a> 和{" "}
                    <a href="#" className="text-slate-700 underline">隐私政策</a>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>

        <div className="pt-10 text-center text-xs text-slate-500">
          © 2026 中国智慧农业平台 · 丰收季版 UI
        </div>
      </div>
    </div>
  );
}
