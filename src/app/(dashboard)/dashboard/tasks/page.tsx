"use client";

import { useState } from "react";
import { Task, TaskStatus, TaskPriority } from "@/types";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Calendar,
  Tag,
  MessageSquare,
  Clock,
  MoreVertical,
} from "lucide-react";

export default function TasksPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "t-1",
      orgId: "org-1",
      creatorId: "user-1",
      title: "Set up Gemini 1.5 Pro Prompt extraction template",
      description: "Extract title, priority, assignee, and due date from WhatsApp text.",
      status: "todo",
      priority: "high",
      labels: ["AI", "Gemini"],
      dueDate: "2026-07-28",
      source: "whatsapp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "t-2",
      orgId: "org-1",
      creatorId: "user-1",
      title: "Configure WhatsApp Cloud API Webhook token verification",
      description: "Ensure GET /api/whatsapp/webhook responds correctly to hub.challenge.",
      status: "in_progress",
      priority: "urgent",
      labels: ["WhatsApp", "API"],
      dueDate: "2026-07-25",
      source: "whatsapp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "t-3",
      orgId: "org-1",
      creatorId: "user-1",
      title: "Build Team Member Invitation & Role Access RBAC",
      description: "Restricted settings and webhook controls for Admin accounts.",
      status: "in_review",
      priority: "medium",
      labels: ["Auth", "Security"],
      dueDate: "2026-07-30",
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "t-4",
      orgId: "org-1",
      creatorId: "user-1",
      title: "Design Next.js SaaS Layout and Glassmorphism System",
      description: "Implemented Tailwind tokens, dark mode gradients, and UI primitives.",
      status: "completed",
      priority: "medium",
      labels: ["UI", "Tailwind"],
      dueDate: "2026-07-22",
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: "todo", title: "To Do", color: "border-slate-700 bg-slate-900/40" },
    { id: "in_progress", title: "In Progress", color: "border-indigo-500/30 bg-indigo-950/20" },
    { id: "in_review", title: "In Review", color: "border-purple-500/30 bg-purple-950/20" },
    { id: "completed", title: "Completed", color: "border-emerald-500/30 bg-emerald-950/20" },
  ];

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-indigo-400" />
            <span>Task Management</span>
          </h1>
          <p className="text-xs text-slate-400">
            Create, assign, filter, and track tasks synced with AI & WhatsApp.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Filter & View Toolbar */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-900/80 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => setViewMode("board")}
            className={cn(
              "flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "board" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={cn("rounded-xl border p-4 flex flex-col space-y-4 min-h-[500px]", col.color)}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {col.title}
                  </span>
                  <span className="h-5 w-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-semibold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="glass-card rounded-xl p-4 space-y-3 cursor-pointer hover:border-indigo-500/40 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider",
                            getPriorityBadge(task.priority)
                          )}
                        >
                          {task.priority}
                        </span>

                        {task.source === "whatsapp" && (
                          <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <MessageSquare className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-slate-100 leading-snug group-hover:text-indigo-300 transition-colors">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                        {task.dueDate ? (
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{task.dueDate}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="divide-y divide-slate-800">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-slate-900/40 rounded-lg transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-200">{task.title}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider",
                        getPriorityBadge(task.priority)
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value as TaskStatus)
                    }
                    className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateTask}
      />
    </div>
  );
}
