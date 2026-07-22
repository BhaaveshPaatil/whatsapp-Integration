import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants = {
      default:
        "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-indigo-500/35",
      secondary:
        "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/60",
      outline:
        "border border-slate-700 bg-transparent hover:bg-slate-800/80 text-slate-200",
      ghost: "hover:bg-slate-800/60 text-slate-300 hover:text-slate-100",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-xs rounded-md",
      lg: "h-12 px-6 text-base rounded-xl",
      icon: "h-10 w-10 p-0",
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
