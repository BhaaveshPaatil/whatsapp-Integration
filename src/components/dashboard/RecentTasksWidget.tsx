import { Task } from "@/types";
import { cn } from "@/lib/utils";
import { Calendar, User, Clock, CheckCircle2 } from "lucide-react";

interface RecentTasksWidgetProps {
  tasks: Task[];
}

export function RecentTasksWidget({ tasks }: RecentTasksWidgetProps) {
  const getPriorityBadge = (priority: string) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_progress":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Recent Team Tasks</h3>
        <span className="text-xs text-indigo-400 hover:underline cursor-pointer">
          View All Tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          No tasks found. Create your first task or sync from WhatsApp!
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1 max-w-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-200">{task.title}</span>
                  {task.source === "whatsapp" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      WhatsApp
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider",
                    getPriorityBadge(task.priority)
                  )}
                >
                  {task.priority}
                </span>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                    getStatusBadge(task.status)
                  )}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
