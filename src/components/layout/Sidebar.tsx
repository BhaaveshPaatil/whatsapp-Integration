"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  MessageSquare,
  Bot,
  BarChart3,
  Settings,
  User,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = user?.role === "admin";

  const navigation = [
    { name: "Dashboard",     href: "/dashboard",           icon: LayoutDashboard },
    { name: "Tasks",         href: "/dashboard/tasks",     icon: CheckSquare },
    { name: "Team",          href: "/dashboard/team",      icon: Users,         adminOnly: true },
    { name: "WhatsApp Hub",  href: "/dashboard/whatsapp",  icon: MessageSquare, adminOnly: true },
    { name: "AI Extractions",href: "/dashboard/ai-logs",   icon: Bot },
    { name: "Analytics",     href: "/dashboard/analytics", icon: BarChart3,     adminOnly: true },
    { name: "Settings",      href: "/dashboard/settings",  icon: Settings,      adminOnly: true },
    { name: "My Profile",    href: "/profile",             icon: User },
  ];

  const filteredNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "relative flex flex-col harbor-sidebar transition-all duration-300 z-30 shrink-0",
        "shadow-[1px_0_0_0_hsl(var(--sidebar-border))]",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* ── Brand Header ──────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {/* Logo mark */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0 truncate">
              <span className="text-sm font-semibold text-foreground leading-tight tracking-tight">
                TaskFlow <span className="gradient-harbor-text">AI</span>
              </span>
              <span className="text-[11px] text-muted-foreground truncate leading-tight">
                {organization?.name || "Workspace"}
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden md:flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "transition-colors duration-150 shrink-0",
            collapsed && "ml-auto"
          )}
          aria-label="Toggle sidebar"
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-2.5 py-2",
                "text-sm font-medium transition-colors duration-150 group",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/15"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-primary" />
              )}

              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />

              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User Footer ───────────────────────────────────────────── */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors cursor-pointer">
            {/* Avatar */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0 truncate">
              <span className="text-xs font-medium text-foreground truncate leading-tight">
                {user?.displayName || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 leading-tight">
                <Sparkles className="h-2.5 w-2.5 text-primary/60" />
                {user?.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
