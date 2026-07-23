import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "harbor";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium text-sm tracking-tight " +
      "rounded-lg transition-all duration-150 cursor-pointer select-none " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
      "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]";

    const variants: Record<string, string> = {
      /* Solid primary */
      default:
        "bg-primary text-primary-foreground shadow-sm " +
        "hover:brightness-110 hover:shadow-glow-sm",

      /* Gradient brand button */
      harbor:
        "bg-gradient-to-r from-primary to-violet-500 text-white shadow-sm " +
        "hover:brightness-110 hover:shadow-glow-sm",

      /* Muted fill */
      secondary:
        "bg-secondary text-secondary-foreground border border-border " +
        "hover:bg-muted hover:border-border/80",

      /* Bordered, transparent fill */
      outline:
        "border border-border bg-transparent text-foreground " +
        "hover:bg-accent hover:text-accent-foreground",

      /* No background */
      ghost:
        "bg-transparent text-muted-foreground " +
        "hover:bg-accent hover:text-foreground",

      /* Danger */
      destructive:
        "bg-destructive text-destructive-foreground shadow-sm " +
        "hover:brightness-110",
    };

    const sizes: Record<string, string> = {
      default: "h-9 px-4 py-2 text-sm",
      sm:      "h-7 px-3 text-xs rounded-md",
      lg:      "h-10 px-5 text-sm",
      icon:    "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
