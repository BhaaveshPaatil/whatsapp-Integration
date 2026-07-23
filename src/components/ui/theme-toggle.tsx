"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/* ── Minimal icon button toggle ─────────────────────────────────── */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-lg",
          "border border-transparent text-muted-foreground",
          "hover:bg-accent hover:text-foreground transition-colors",
          className
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg",
        "border border-transparent text-muted-foreground",
        "hover:bg-accent hover:text-foreground hover:border-border",
        "transition-all duration-150",
        className
      )}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      aria-label="Toggle theme"
    >
      {/* Sun fades out in dark, fades in in light */}
      <Sun
        className={cn(
          "h-4 w-4 absolute transition-all duration-200",
          isDark ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0"
        )}
      />
      {/* Moon fades in in dark */}
      <Moon
        className={cn(
          "h-4 w-4 absolute transition-all duration-200",
          isDark ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90"
        )}
      />
    </button>
  );
}

/* ── Segmented pill switcher (used in Header) ────────────────────── */
export function ThemeSwitcherPill() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const current = resolvedTheme ?? "dark";

  return (
    <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border gap-0.5">
      {/* Light */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150",
          current === "light"
            ? "bg-background text-foreground shadow-sm border border-border"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={current === "light"}
      >
        <Sun className="h-3.5 w-3.5" />
        <span>Light</span>
      </button>

      {/* Dark */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150",
          current === "dark"
            ? "bg-background text-foreground shadow-sm border border-border"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={current === "dark"}
      >
        <Moon className="h-3.5 w-3.5" />
        <span>Dark</span>
      </button>
    </div>
  );
}

/* ── Full-size theme selector grid (used in settings) ────────────── */
export function ThemeSelector() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const current = resolvedTheme ?? "dark";

  const options = [
    { value: "light", label: "Light",  icon: Sun,     desc: "Clean white interface" },
    { value: "dark",  label: "Dark",   icon: Moon,    desc: "Dark navy interface" },
    { value: "system",label: "System", icon: Monitor, desc: "Follow OS setting" },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {options.map(({ value, label, icon: Icon, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium",
            "transition-all duration-150 text-center",
            current === value
              ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
          )}
          aria-pressed={current === value}
        >
          <Icon className={cn("h-5 w-5", current === value ? "text-primary" : "text-muted-foreground")} />
          <div>
            <p className="text-sm font-semibold leading-tight">{label}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
