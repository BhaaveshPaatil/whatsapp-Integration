"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, CheckCircle2, MessageSquare, Zap } from "lucide-react";
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

export default function AnalyticsPage() {
  const weeklyData = [
    { day: "Mon", tasks: 12, completed: 8 },
    { day: "Tue", tasks: 19, completed: 14 },
    { day: "Wed", tasks: 15, completed: 11 },
    { day: "Thu", tasks: 22, completed: 18 },
    { day: "Fri", tasks: 28, completed: 24 },
    { day: "Sat", tasks: 9, completed: 7 },
    { day: "Sun", tasks: 5, completed: 4 },
  ];

  const sourceData = [
    { name: "WhatsApp AI Auto", value: 65, color: "#818cf8" },
    { name: "Manual Creation", value: 35, color: "#34d399" },
  ];

  const priorityData = [
    { priority: "Urgent", count: 8, fill: "#f87171" },
    { priority: "High", count: 14, fill: "#fbbf24" },
    { priority: "Medium", count: 24, fill: "#60a5fa" },
    { priority: "Low", count: 12, fill: "#9ca3af" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-indigo-400" />
          <span>Productivity & Team Analytics</span>
        </h1>
        <p className="text-xs text-slate-400">
          Comprehensive reporting, task completion throughput, and AI automation metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Throughput Area Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Weekly Task Throughput</CardTitle>
            <CardDescription>Created vs Completed tasks over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="#818cf8"
                  fillOpacity={1}
                  fill="url(#colorTasks)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#34d399"
                  fillOpacity={0.1}
                  fill="#34d399"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Breakdown Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Tasks by Priority</CardTitle>
            <CardDescription>Distribution of active backlog tasks by urgency</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="priority" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Task Creation Source Distribution */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Task Creation Origin</CardTitle>
          <CardDescription>Percentage of tasks generated via WhatsApp AI vs manual entry</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                >
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
                <span className="text-slate-300 font-medium">{item.name}</span>
                <span className="font-bold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
