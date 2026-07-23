"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToAnalyticsEvents, subscribeToAiExtractions } from "@/lib/services/pipelineClient";
import type { AnalyticsEvent, AiExtractionRecord } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [extractions, setExtractions] = useState<AiExtractionRecord[]>([]);

  useEffect(() => {
    if (!user?.orgId) return;
    const u1 = subscribeToAnalyticsEvents(user.orgId, setEvents, () => setEvents([]));
    const u2 = subscribeToAiExtractions(user.orgId, setExtractions, () => setExtractions([]), 200);
    return () => {
      u1();
      u2();
    };
  }, [user?.orgId]);

  const weeklyData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return {
        day: DAY_LABELS[d.getDay()],
        key: d.toISOString().slice(0, 10),
        tasks: 0,
        completed: 0,
        messages: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const e of events) {
      const key = e.createdAt?.slice(0, 10);
      const bucket = key ? byKey.get(key) : undefined;
      if (!bucket) continue;
      if (e.type === "task_created") bucket.tasks += 1;
      if (e.type === "task_completed") bucket.completed += 1;
      if (e.type === "message_received") bucket.messages += 1;
    }

    return buckets;
  }, [events]);

  const sourceData = useMemo(() => {
    const ai = events.filter((e) => e.type === "task_created").length;
    const total = Math.max(ai, 1);
    // Manual creates are not yet emitted from the client — show AI share of pipeline events
    const manualProxy = Math.max(
      0,
      events.filter((e) => e.type === "message_received").length - ai
    );
    const aiPct = Math.round((ai / (ai + manualProxy || 1)) * 100);
    return [
      { name: "WhatsApp AI Auto", value: aiPct || (ai > 0 ? 100 : 0), color: "#0D9B82" },
      {
        name: "Other / Manual",
        value: 100 - (aiPct || (ai > 0 ? 100 : 0)),
        color: "#5C6B64",
      },
    ];
  }, [events]);

  const confidenceData = useMemo(() => {
    const bands = [
      { priority: "0.9+", count: 0, fill: "#34d399" },
      { priority: "0.75–0.9", count: 0, fill: "#60a5fa" },
      { priority: "0.6–0.75", count: 0, fill: "#fbbf24" },
      { priority: "<0.6", count: 0, fill: "#f87171" },
    ];
    for (const ex of extractions) {
      const c = ex.action?.confidenceScore ?? 0;
      if (c >= 0.9) bands[0].count += 1;
      else if (c >= 0.75) bands[1].count += 1;
      else if (c >= 0.6) bands[2].count += 1;
      else bands[3].count += 1;
    }
    return bands;
  }, [extractions]);

  const stats = useMemo(() => {
    const received = events.filter((e) => e.type === "message_received").length;
    const created = events.filter((e) => e.type === "task_created").length;
    const review = events.filter((e) => e.type === "needs_review").length;
    const failed = events.filter((e) => e.type === "processing_failed").length;
    const avgLatency =
      extractions.length === 0
        ? 0
        : Math.round(extractions.reduce((s, e) => s + (e.latencyMs || 0), 0) / extractions.length);
    return { received, created, review, failed, avgLatency };
  }, [events, extractions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span>Productivity & Pipeline Analytics</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Event-driven metrics from message intake, AI extraction, and task outcomes.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Messages", value: stats.received },
          { label: "Tasks created", value: stats.created },
          { label: "Needs review", value: stats.review },
          { label: "Failures", value: stats.failed },
          { label: "Avg AI latency", value: `${stats.avgLatency}ms` },
        ].map((s) => (
          <div key={s.label} className="harbor-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Pipeline Throughput</CardTitle>
            <CardDescription>Messages, tasks created, and completions (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9B82" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9B82" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area type="monotone" dataKey="messages" stroke="#34d399" fillOpacity={0.1} fill="#34d399" />
                <Area type="monotone" dataKey="tasks" stroke="#0D9B82" fillOpacity={1} fill="url(#colorTasks)" />
                <Area type="monotone" dataKey="completed" stroke="#fbbf24" fillOpacity={0.1} fill="#fbbf24" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Confidence Distribution</CardTitle>
            <CardDescription>How often extractions land in auto / review / ignore bands</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <XAxis dataKey="priority" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Creation Origin</CardTitle>
          <CardDescription>Share of pipeline-created tasks vs other volume</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                  {sourceData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            {sourceData.map((item) => (
              <div key={item.name} className="flex items-center space-x-3 text-xs">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-harbor-secondary font-medium">{item.name}</span>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
