import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  subtext?: string;
}

export function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  iconColor = "text-indigo-400",
  subtext,
}: MetricCardProps) {
  return (
    <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-slate-700/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className={cn("p-2 rounded-lg bg-slate-900/80 border border-slate-800", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {subtext && <p className="mt-2 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
