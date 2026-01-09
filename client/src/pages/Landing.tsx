import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Database,
  Monitor,
  PlayCircle,
  Repeat,
  ShoppingCart,
  Tractor,
  Wheat,
} from "lucide-react";
import { useLocation } from "wouter";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const itemVariants = {
  hidden: { y: 14, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 140, damping: 20 },
  },
};

const brands = [
  { id: "john_deere", name: "John Deere", color: "#367C2B", image: "/images/machines/john_deere_harvester.jpg" },
  { id: "case_ih", name: "CASE IH", color: "#C8102E", image: "/images/machines/case_ih_harvester.jpg" },
  { id: "new_holland", name: "New Holland", color: "#005BBB", image: "/images/machines/new_holland_harvester.jpg" },
  { id: "claas", name: "CLAAS", color: "#00A651", image: "/images/machines/claas_harvester.jpg" },
  { id: "grain_cart", name: "Grain Cart", color: "#9A6B2F", image: "/images/machines/grain_cart.jpg" },
];

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen text-slate-900 selection:bg-amber-300/40">
      {/* 背景：丰收金 + 农田绿 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_20%,rgba(245,178,49,0.28),transparent_55%),radial-gradient(900px_circle_at_80%_10%,rgba(34,197,94,0.18),transparent_55%),radial-gradient(900px_circle_at_60%_80%,rgba(59,130,246,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff7e6] via-[#f7fbf7] to-white" />
        <div className="absolute inset-0 opacity-25">
          <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/80" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-md flex items-center justify-center ring-1 ring-black/5">
              <Wheat className="h-5 w-5 text-[#1f6b3a]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm text-slate-600">China Smart Agriculture</div>
              <div className="text-base md:text-lg font-semibold tracking-tight">中国智慧农业平台</div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-slate-700 hover:text-slate-900"
            onClick={() => navigate("/login")}
          >
            管理员登录 <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.header>

        {/* Hero */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-7">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-xl px-4 py-2 ring-1 ring-black/5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">丰收季 · 全场可视 · 多品牌机队</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="mt-5 text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              看得见全场
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#1f6b3a] via-[#d97706] to-[#0f172a]">
                管得住机队 · 算得清效益 · 盘得活资源
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
              以“农业大丰收”为灵感，把地图、机队、告警、作业与交易汇聚到一个指挥中枢：一眼看清全场态势，一键做出运营决策。
            </motion.p>

            <motion.div variants={itemVariants} className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white shadow-lg shadow-emerald-900/15"
                onClick={() => navigate("/login")}
              >
                <Database className="mr-2 h-5 w-5" />
                正式运行登录
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-black/10 bg-white/60 hover:bg-white/80 text-slate-900 backdrop-blur-xl"
                onClick={() => navigate("/simulate")}
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                模拟运行鉴赏
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-7 flex flex-wrap gap-2">
              {brands.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-black/5"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.name}
                </span>
              ))}
            </motion.div>
          </div>

          {/* 右侧：农机品牌卡片墙 */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="group relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl ring-1 ring-black/5 shadow-lg"
                >
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/0 to-white/40" />
                    <img
                      src={b.image}
                      alt={b.name}
                      className="h-full w-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="relative p-4 h-[140px] flex flex-col justify-between">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-xs font-bold text-white drop-shadow">{b.name}</span>
                    </div>
                    <div className="text-[11px] text-white/90 drop-shadow">
                      丰收作业 · 机队协同 · 实时可视
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* 功能介绍 */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <FeatureCard icon={<Monitor className="h-6 w-6 text-emerald-700" />} title="经营指挥大屏" desc="地图即桌面：地块、机队与告警同屏呈现，管理者一眼掌握全场。" />
          <FeatureCard icon={<Tractor className="h-6 w-6 text-sky-700" />} title="多品牌机队管理" desc="跨品牌设备统一台账与状态管理，位置、油量、工况、维保一体化。" />
          <FeatureCard icon={<AlertTriangle className="h-6 w-6 text-amber-700" />} title="智能告警中心" desc="低油量/超速/维保超期等告警自动汇总，减少停机与损失。" />
          <FeatureCard icon={<Repeat className="h-6 w-6 text-violet-700" />} title="作业交易与调度" desc="需求发布、竞价接单、全流程跟踪，把协同效率提升一个量级。" />
          <FeatureCard icon={<ShoppingCart className="h-6 w-6 text-orange-700" />} title="设备交易频道" desc="盘活闲置设备，结构化参数展示 + 筛选排序，快速匹配买卖双方。" />
          <FeatureCard icon={<BarChart3 className="h-6 w-6 text-cyan-700" />} title="收益与效率核算" desc="亩产、油耗、工时、效率自动汇总，让“算得清效益”变得简单。" />
        </motion.section>

        <div className="mt-auto pt-14 text-center text-xs text-slate-500">
          © 2026 中国智慧农业平台 · 丰收季版 UI
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-3xl bg-white/65 backdrop-blur-xl ring-1 ring-black/5 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/35 to-emerald-300/20 blur-2xl" />
      <div className="relative p-7">
        <div className="inline-flex items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm">
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

