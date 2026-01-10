import React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorBannerTone = "error" | "warning" | "info";

type ErrorBannerProps = {
  title: string;
  description?: string;
  tone?: ErrorBannerTone;
  right?: React.ReactNode;
  className?: string;
};

const toneStyles: Record<ErrorBannerTone, { wrap: string; icon: React.ElementType }> = {
  error: {
    wrap: "border border-destructive/30 bg-destructive/10 text-destructive-foreground",
    icon: ShieldAlert,
  },
  warning: {
    wrap: "border border-amber-500/30 bg-amber-500/10 text-foreground",
    icon: AlertTriangle,
  },
  info: {
    wrap: "border border-sky-500/25 bg-sky-500/10 text-foreground",
    icon: Info,
  },
};

export function ErrorBanner({ title, description, tone = "error", right, className }: ErrorBannerProps) {
  const Icon = toneStyles[tone].icon;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl p-4",
        toneStyles[tone].wrap,
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold leading-5">{title}</div>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

