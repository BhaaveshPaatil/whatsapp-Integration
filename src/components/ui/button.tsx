import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "harbor";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants = {
      default:
        "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-500/30 border border-indigo-500/30",
      harbor:
        "bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 hover:shadow-indigo-500/40 border border-indigo-400/30",
      secondary:
        "bg-muted text-foreground hover:bg-muted/80 border border-border shadow-sm",
      outline:
        "border border-border bg-transparent hover:bg-muted text-foreground hover:border-indigo-500/30",
      ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 border border-rose-500/30",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-[11px] rounded-lg",
      lg: "h-11 px-6 text-sm rounded-xl",
      icon: "h-9 w-9 p-0 rounded-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
