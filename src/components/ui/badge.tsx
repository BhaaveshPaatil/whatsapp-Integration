import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline";
  dot?: boolean;
}

function Badge({ className, variant = "default", dot = true, children, ...props }: BadgeProps) {
  // All variants use CSS variable-driven colors from globals.css badge-* classes
  // so they render correctly in both light and dark mode without hardcoding
  const variants: Record<string, string> = {
    default:
      "border-primary/20 bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary/90",
    secondary:
      "border-border bg-muted text-muted-foreground",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 " +
      "dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 " +
      "dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25",
    danger:
      "border-red-500/20 bg-red-500/10 text-red-700 " +
      "dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25",
    info:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 " +
      "dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/25",
    outline:
      "border-border bg-transparent text-foreground",
  };

  const dotColors: Record<string, string> = {
    default:   "bg-primary",
    secondary: "bg-muted-foreground",
    success:   "bg-emerald-500",
    warning:   "bg-amber-500",
    danger:    "bg-red-500",
    info:      "bg-sky-500",
    outline:   "bg-muted-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-[11px] font-medium tracking-wide transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </div>
  );
}

export { Badge };
