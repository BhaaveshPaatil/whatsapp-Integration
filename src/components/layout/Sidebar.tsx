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
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Team", href: "/dashboard/team", icon: Users, adminOnly: true },
    { name: "WhatsApp Hub", href: "/dashboard/whatsapp", icon: MessageSquare, adminOnly: true },
    { name: "AI Extractions", href: "/dashboard/ai-logs", icon: Bot },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, adminOnly: true },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, adminOnly: true },
    { name: "My Profile", href: "/profile", icon: User },
  ];

  const filteredNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card/80 backdrop-blur-2xl transition-all duration-300 z-30",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Indigo Harbor Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-foreground tracking-tight leading-tight flex items-center gap-1">
                TaskFlow <span className="gradient-harbor-text">AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {organization?.name || "Workspace"}
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all group",
                isActive
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-500 shadow-sm shadow-indigo-500" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-indigo-500 dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* User Role Footer */}
      {!collapsed && (
        <div className="p-3.5 border-t border-border bg-muted/30">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-card border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-semibold text-xs shrink-0">
              {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-foreground truncate">
                {user?.displayName || "User"}
              </span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 capitalize font-medium flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                {user?.role === "admin" ? "Org Admin" : "Team Member"}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
