"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTasksWidget } from "@/components/dashboard/RecentTasksWidget";
import { WhatsAppActivityWidget } from "@/components/dashboard/WhatsAppActivityWidget";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { CheckSquare, Users, MessageSquare, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { subscribeToOrgTasks } from "@/lib/services/taskService";
import { subscribeToOrganizationTeam } from "@/lib/services/team";

export default function DashboardPage() {
  const { user, organization } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToOrgTasks(
      organization.id,
      (orgTasks) => {
        setTasks(orgTasks);
        setIsLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) {
      setTeamMemberCount(0);
      setPendingInviteCount(0);
      return;
    }

    const unsubscribe = subscribeToOrganizationTeam(
      organization.id,
      (members) => {
        setTeamMemberCount(members.filter((member) => member.status === "active").length);
        setPendingInviteCount(members.filter((member) => member.status === "pending").length);
      },
      (subscriptionError) => setError(subscriptionError.message)
    );

    return unsubscribe;
  }, [organization?.id]);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    const activeTasks = tasks.filter((task) => task.status !== "completed").length;
    const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const whatsappTasks = tasks.filter(
      (task) => task.source === "whatsapp" || task.source === "ai_extracted"
    ).length;

    return {
      totalTasks: tasks.length,
      completedTasks,
      activeTasks,
      completionRate,
      whatsappTasks,
    };
  }, [tasks]);

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-harbor-card via-harbor-surfaceAlt to-harbor-surface border border-border shadow-[0_22px_60px_-42px_rgba(0,0,0,0.9)]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-semibold text-foreground tracking-tight">
              Welcome back, {user?.displayName || "Admin"}! 👋
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-indigo-200 border border-primary/25 capitalize">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
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

      {error && (
        <div className="p-3 text-xs text-red-300 bg-harbor-danger/10 border border-harbor-danger/25 rounded-xl">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Organization Tasks"
          value={isLoading ? "..." : stats.totalTasks}
          change={`${stats.activeTasks} active`}
          isPositive={true}
          icon={CheckSquare}
          iconColor="text-indigo-400"
          subtext="Active tasks across teams"
        />

        <MetricCard
          title="Completed Tasks"
          value={isLoading ? "..." : stats.completedTasks}
          change={`${stats.completionRate}%`}
          isPositive={true}
          icon={Sparkles}
          iconColor="text-emerald-400"
          subtext="Completion rate"
        />

        <MetricCard
          title="Active Team Members"
          value={isLoading ? "..." : teamMemberCount}
          change={`+${pendingInviteCount}`}
          isPositive={true}
          icon={Users}
          iconColor="text-blue-400"
          subtext={`${pendingInviteCount} pending invitations`}
        />

        <MetricCard
          title="WhatsApp AI Extractions"
          value={isLoading ? "..." : stats.whatsappTasks}
          change={`${stats.totalTasks ? Math.round((stats.whatsappTasks / stats.totalTasks) * 100) : 0}%`}
          isPositive={true}
          icon={MessageSquare}
          iconColor="text-purple-400"
          subtext="Messages converted to tasks"
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTasksWidget tasks={recentTasks} />
        <WhatsAppActivityWidget />
      </div>
    </div>
  );
}
