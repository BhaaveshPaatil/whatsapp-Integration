"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTasksWidget } from "@/components/dashboard/RecentTasksWidget";
import { WhatsAppActivityWidget } from "@/components/dashboard/WhatsAppActivityWidget";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { CheckSquare, Users, MessageSquare, Bot, Plus, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, organization } = useAuthStore();

  const dummyTasks: Task[] = [
    {
      id: "task-1",
      orgId: organization?.id || "org-1",
      title: "Integrate WhatsApp Cloud API Webhook Verification",
      description: "Set up verification endpoint and access token parsing.",
      status: "in_progress",
      priority: "urgent",
      creatorId: user?.uid || "u1",
      labels: ["WhatsApp", "Backend"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "whatsapp",
    },
    {
      id: "task-2",
      orgId: organization?.id || "org-1",
      title: "Gemini Prompt Tuning for Date & Priority Extraction",
      description: "Improve structured JSON output accuracy for incoming messages.",
      status: "todo",
      priority: "high",
      creatorId: user?.uid || "u1",
      labels: ["AI", "Gemini"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "manual",
    },
    {
      id: "task-3",
      orgId: organization?.id || "org-1",
      title: "Update Team Member Role Permission Guards",
      description: "Enforce Admin-only access to organization configuration.",
      status: "completed",
      priority: "medium",
      creatorId: user?.uid || "u1",
      labels: ["Security"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "manual",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-purple-950/30 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.displayName || "Admin"}! 👋
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 capitalize">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {organization?.name || "Organization"} workspace overview & real-time telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/tasks">
            <Button className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Organization Tasks"
          value="24"
          change="+18%"
          isPositive={true}
          icon={CheckSquare}
          iconColor="text-indigo-400"
          subtext="Active tasks across teams"
        />

        <MetricCard
          title="Completed Tasks"
          value="16"
          change="+25%"
          isPositive={true}
          icon={Sparkles}
          iconColor="text-emerald-400"
          subtext="66% completion rate"
        />

        <MetricCard
          title="Active Team Members"
          value="8"
          change="+2"
          isPositive={true}
          icon={Users}
          iconColor="text-blue-400"
          subtext="2 pending invitations"
        />

        <MetricCard
          title="WhatsApp AI Extractions"
          value="42"
          change="+34%"
          isPositive={true}
          icon={MessageSquare}
          iconColor="text-purple-400"
          subtext="Messages converted to tasks"
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTasksWidget tasks={dummyTasks} />
        <WhatsAppActivityWidget />
      </div>
    </div>
  );
}
