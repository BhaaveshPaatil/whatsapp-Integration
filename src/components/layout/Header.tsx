"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutUser } from "@/lib/services/auth";
import { useRouter } from "next/navigation";
import { Search, Bell, User, LogOut, Building2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcherPill } from "@/components/ui/theme-toggle";
import { CommandPalette } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const { user, organization, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    router.push("/login");
  };

  return (
    <>
      <header className="harbor-glass-header sticky top-0 flex h-14 w-full items-center justify-between px-5 z-20">

        {/* ── Search / Command Palette Trigger ──────────────────── */}
        <div className="flex items-center flex-1 max-w-sm">
          <button
            onClick={() => setShowCommandPalette(true)}
            className={cn(
              "relative w-full flex items-center justify-between rounded-lg",
              "bg-muted/60 border border-border",
              "px-3 py-2 text-sm text-muted-foreground",
              "hover:border-primary/40 hover:bg-muted hover:text-foreground",
              "transition-all duration-150 text-left"
            )}
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Search or jump to...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── Right Controls ─────────────────────────────────────── */}
        <div className="flex items-center gap-2">

          {/* Workspace chip */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium truncate max-w-[140px]">
              {organization?.name || "TaskFlow Workspace"}
            </span>
          </div>

          {/* Theme switcher */}
          <ThemeSwitcherPill />

          {/* Notifications */}
          <button className={cn(
            "relative h-8 w-8 flex items-center justify-center rounded-lg",
            "text-muted-foreground border border-transparent",
            "hover:bg-accent hover:text-foreground hover:border-border",
            "transition-all duration-150"
          )}>
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                "flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg",
                "border border-transparent",
                "hover:bg-accent hover:border-border",
                "transition-all duration-150"
              )}
            >
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-[100px]">
                {user?.displayName?.split(" ")[0] || "User"}
              </span>
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />

                {/* Dropdown */}
                <div className="absolute right-0 mt-1.5 w-56 harbor-popover rounded-xl overflow-hidden z-50 animate-scale-in">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user?.email}
                    </p>
                    <div className="mt-2">
                      <Badge variant="default" dot={false}>
                        <ShieldCheck className="h-3 w-3 mr-0.5" />
                        <span className="capitalize">{user?.role}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>My Profile</span>
                    </Link>
                  </div>

                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </>
  );
}
