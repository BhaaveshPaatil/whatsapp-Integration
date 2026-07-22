"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("w-9 h-9 rounded-xl border border-border/50", className)}>
        <Sun className="h-4 w-4 text-amber-500" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all border border-border shadow-sm",
        className
      )}
      title={`Switch to ${isDark ? "White (Light Mode)" : "Dark Mode"}`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
}

export function ThemeSwitcherPill() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = resolvedTheme || "dark";

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-muted border border-border shadow-inner">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all",
          currentTheme === "light"
            ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-sm border border-border font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all",
          currentTheme === "dark"
            ? "bg-card text-indigo-400 shadow-sm border border-border font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-3.5 w-3.5 text-indigo-400" />
        <span>Dark</span>
      </button>
    </div>
  );
}

export function ThemeSelector() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = resolvedTheme || "dark";

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center justify-center space-x-2.5 p-3.5 rounded-xl border transition-all text-xs font-semibold shadow-sm",
          currentTheme === "light"
            ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 font-bold"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Sun className="h-4 w-4 text-amber-500" />
        <span>White / Light Theme</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center justify-center space-x-2.5 p-3.5 rounded-xl border transition-all text-xs font-semibold shadow-sm",
          currentTheme === "dark"
            ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20 font-bold"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Moon className="h-4 w-4 text-indigo-400" />
        <span>Dark Theme</span>
      </button>
    </div>
  );
}
