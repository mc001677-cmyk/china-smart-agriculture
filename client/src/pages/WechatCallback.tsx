import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Wheat } from "lucide-react";
import { toast } from "sonner";
import { getDefaultPostAuthPath, parseNextFromSearch, toLoginPath } from "@/lib/authPaths";
import { toDashboardPath } from "@/lib/dashboardNav";

export default function WechatCallback() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [status, setStatus] = useState("正在处理微信登录...");
  const next = parseNextFromSearch(search);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get("code");

    if (!code) {
      toast.error("微信授权失败");
      setLocation(toLoginPath(next ?? undefined));
      return;
    }

    const handleCallback = async () => {
      try {
        const r = await fetch("/api/auth/wechat/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await r.json();

        if (data.ok) {
          if (!data.hasPhone) {
            toast.info("登录成功，请绑定手机号以继续");
            const postAuthBase = getDefaultPostAuthPath(next, "");
            const bindBase = toDashboardPath(postAuthBase, "bind-phone");
            setLocation(bindBase + (next ? `?next=${encodeURIComponent(next)}` : ""));
          } else {
            toast.success("登录成功");
            setLocation(getDefaultPostAuthPath(next, ""));
          }
        } else {
          throw new Error(data.error || "登录失败");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "登录失败");
        setLocation(toLoginPath(next ?? undefined));
      }
    };

    handleCallback();
  }, [search, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg flex items-center justify-center mb-6 animate-pulse">
        <Wheat className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{status}</h2>
      <p className="text-slate-500 mt-2">请稍候，正在为您同步账户信息</p>
    </div>
  );
}
