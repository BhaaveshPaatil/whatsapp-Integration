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
  iconColor = "text-primary",
  subtext,
}: MetricCardProps) {
  return (
    <div className="harbor-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-xl bg-muted border border-border", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-foreground tracking-tight">{value}</span>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive
                ? "bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/20"
                : "bg-harbor-danger/10 text-red-700 dark:text-red-300 border border-harbor-danger/20"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
