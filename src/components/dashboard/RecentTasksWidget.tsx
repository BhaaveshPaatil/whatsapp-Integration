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
        return "bg-harbor-danger/10 text-red-300 border-harbor-danger/25";
      case "high":
        return "bg-harbor-warning/10 text-amber-300 border-harbor-warning/25";
      case "medium":
        return "bg-primary/10 text-primary border-primary/25";
      default:
        return "bg-harbor-surfaceAlt text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-harbor-success/10 text-emerald-300 border-harbor-success/25";
      case "in_progress":
        return "bg-primary/10 text-primary border-primary/25";
      default:
        return "bg-harbor-surfaceAlt text-muted-foreground border-border";
    }
  };

  return (
    <div className="harbor-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Recent Team Tasks</h3>
        <span className="text-xs text-primary hover:text-primary cursor-pointer transition-colors">
          View All Tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs">
          No tasks found. Create your first task or sync from WhatsApp!
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 rounded-xl bg-harbor-surfaceAlt border border-border hover:border-primary/25 transition-all duration-200"
            >
              <div className="space-y-1 max-w-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">{task.title}</span>
                  {task.source === "whatsapp" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-harbor-success/10 text-emerald-300 border border-harbor-success/20 font-medium">
                      WhatsApp
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
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
