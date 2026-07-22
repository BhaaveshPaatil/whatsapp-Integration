"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutUser } from "@/lib/services/auth";
import { useRouter } from "next/navigation";
import { Search, Bell, User, LogOut, Building, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcherPill } from "@/components/ui/theme-toggle";
import { CommandPalette } from "@/components/ui/command-palette";

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
      <header className="harbor-glass-header sticky top-0 flex h-16 w-full items-center justify-between px-6 z-20 transition-colors duration-200">
        {/* Search Bar / Command Palette Trigger */}
        <div className="flex items-center space-x-4 flex-1 max-w-md">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="relative w-full flex items-center justify-between rounded-xl bg-card border border-border px-3.5 py-2 text-xs text-muted-foreground hover:border-indigo-500/40 hover:text-foreground transition-all text-left shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>Search tasks, team, WhatsApp logs...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Navbar Controls */}
        <div className="flex items-center space-x-3">
          {/* Workspace Organization Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs">
            <Building className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="font-medium text-foreground">
              {organization?.name || "TaskFlow Workspace"}
            </span>
          </div>

          {/* Explicit Light / Dark Theme Switcher Pill */}
          <ThemeSwitcherPill />

          {/* Notifications Indicator */}
          <button className="relative p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border transition-all">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-background animate-pulse" />
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-2 p-1 rounded-xl hover:bg-muted border border-transparent hover:border-border transition-all"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-semibold shadow-md shadow-indigo-500/20">
                {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl harbor-card bg-popover border border-border shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">{user?.displayName || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge variant="default">
                      <ShieldCheck className="h-3 w-3" />
                      <span className="capitalize">{user?.role}</span>
                    </Badge>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>My Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center space-x-2 px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </>
  );
}
