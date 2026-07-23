"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search, CheckSquare, Users, MessageSquare, Bot, Settings, User, X, ArrowRight, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/gsap";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const modalRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isOpen && modalRef.current) {
        gsap.from(modalRef.current, {
          opacity: 0,
          scale: 0.97,
          y: -6,
          duration: 0.18,
          ease: "power2.out",
        });
      }
    },
    { dependencies: [isOpen], scope: modalRef }
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset query when closing
  React.useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { id: "dashboard", label: "Dashboard", desc: "Overview & stats",          icon: LayoutDashboard, href: "/dashboard" },
    { id: "tasks",     label: "Tasks",     desc: "Task management board",      icon: CheckSquare,     href: "/dashboard/tasks" },
    { id: "whatsapp",  label: "WhatsApp",  desc: "WhatsApp Business Hub",      icon: MessageSquare,   href: "/dashboard/whatsapp" },
    { id: "ai-logs",   label: "AI Logs",   desc: "Gemini AI telemetry",        icon: Bot,             href: "/dashboard/ai-logs" },
    { id: "team",      label: "Team",      desc: "Manage team members",        icon: Users,           href: "/dashboard/team" },
    { id: "settings",  label: "Settings",  desc: "Organization & API config",  icon: Settings,        href: "/dashboard/settings" },
    { id: "profile",   label: "Profile",   desc: "My account settings",        icon: User,            href: "/profile" },
  ];

  const filtered = query.trim()
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.desc.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg harbor-popover rounded-xl overflow-hidden"
        style={{ maxHeight: "min(520px, 80vh)" }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search pages and actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filtered.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(action.href)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2.5",
                      "text-left text-sm transition-colors duration-100 group",
                      "hover:bg-accent text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">{action.label}</p>
                        <p className="text-xs text-muted-foreground leading-tight">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30">
          <span>Navigate with ↑↓</span>
          <span>
            <kbd className="harbor-kbd">esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
