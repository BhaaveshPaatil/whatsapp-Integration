import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline";
  dot?: boolean;
}

function Badge({ className, variant = "default", dot = true, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20",
    secondary: "bg-muted text-muted-foreground border-border",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    outline: "border-border bg-transparent text-foreground",
  };

  const dotColors = {
    default: "bg-indigo-500",
    secondary: "bg-muted-foreground",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    outline: "bg-muted-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </div>
  );
}

export { Badge };
