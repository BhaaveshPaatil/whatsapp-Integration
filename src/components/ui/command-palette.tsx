"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CheckSquare, Users, MessageSquare, Bot, Settings, User, X, ArrowRight } from "lucide-react";
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
          scale: 0.96,
          y: -10,
          duration: 0.2,
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
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: "nav-tasks", label: "View Task Management Board", icon: CheckSquare, href: "/dashboard/tasks" },
    { id: "nav-whatsapp", label: "Open WhatsApp Business Hub", icon: MessageSquare, href: "/dashboard/whatsapp" },
    { id: "nav-ai", label: "Inspect Gemini AI Telemetry Logs", icon: Bot, href: "/dashboard/ai-logs" },
    { id: "nav-team", label: "Manage Organization Team Members", icon: Users, href: "/dashboard/team" },
    { id: "nav-settings", label: "Organization & API Settings", icon: Settings, href: "/dashboard/settings" },
    { id: "nav-profile", label: "My Profile Settings", icon: User, href: "/profile" },
  ];

  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-xl harbor-card rounded-2xl shadow-2xl border border-border overflow-hidden bg-popover text-foreground"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border py-3">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search tasks, pages, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands or pages found.
            </div>
          ) : (
            filteredActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.href)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-foreground hover:bg-muted transition-colors group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Navigate with ⌘K</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
