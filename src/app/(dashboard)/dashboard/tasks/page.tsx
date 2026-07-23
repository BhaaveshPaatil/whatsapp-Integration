"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import type { TaskInput } from "@/lib/validations/task";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  createTask,
  deleteTask,
  subscribeToOrgTasks,
  updateTask,
} from "@/lib/services/taskService";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Calendar,
  MessageSquare,
  Edit2,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Timestamp } from "firebase/firestore";

function formatTaskDate(value?: Timestamp | null): string {
  if (!value) return "";
  return value.toDate().toISOString().split("T")[0];
}

function parseLabels(labels?: string): string[] {
  if (!labels) return [];
  return labels
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

export default function TasksPage() {
  const { user, organization } = useAuthStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null);

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

  const handleSaveTask = async (data: TaskInput) => {
    if (!organization?.id || !user?.uid) {
      setError("Organization or user session is missing.");
      return;
    }

    try {
      setError(null);
      const taskPayload = {
        title: data.title,
        description: data.description || "",
        priority: data.priority,
        status: data.status,
        assigneeId: data.assigneeId || "",
        dueDate: data.dueDate || "",
        labels: parseLabels(data.labels),
      };

      if (editingTask) {
        await updateTask(editingTask.id, taskPayload);
        setEditingTask(null);
        return;
      }

      await createTask({
        ...taskPayload,
        orgId: organization.id,
        createdBy: user.uid,
        source: "manual",
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save task.");
      throw saveError;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setError(null);
      setMutatingTaskId(taskId);
      await updateTask(taskId, { status: newStatus });
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update task status.");
    } finally {
      setMutatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const shouldDelete = window.confirm("Delete this task?");
    if (!shouldDelete) return;

    try {
      setError(null);
      setMutatingTaskId(taskId);
      await deleteTask(taskId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete task.");
    } finally {
      setMutatingTaskId(null);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsCreateOpen(true);
  };

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }), [priorityFilter, searchQuery, tasks]);

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: "todo", title: "To Do", color: "border-border bg-harbor-surface/70" },
    { id: "in_progress", title: "In Progress", color: "border-primary/25 bg-primary/5" },
    { id: "in_review", title: "In Review", color: "border-indigo-400/20 bg-harbor-surfaceAlt/80" },
    { id: "completed", title: "Completed", color: "border-harbor-success/25 bg-harbor-success/5" },
  ];

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-harbor-danger/10 text-red-300 border-harbor-danger/25";
      case "high":
        return "bg-harbor-warning/10 text-amber-300 border-harbor-warning/25";
      case "medium":
        return "bg-primary/10 text-indigo-200 border-primary/25";
      default:
        return "bg-harbor-surfaceAlt text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-indigo-300" />
            <span>Task Management</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Create, assign, filter, and track tasks synced with AI & WhatsApp.
          </p>
        </div>

        <Button onClick={openCreateModal} className="space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-300 bg-harbor-danger/10 border border-harbor-danger/25 rounded-xl">
          {error}
        </div>
      )}

      {/* Filter & View Toolbar */}
      <div className="harbor-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="harbor-input w-full pl-9"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="harbor-input"
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
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-harbor-surfaceAlt border border-border">
          <button
            onClick={() => setViewMode("board")}
            className={cn(
              "flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "board" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Board View */}
      {isLoading ? (
        <div className="harbor-card p-8 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-indigo-300" />
          Loading tasks...
        </div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={cn("rounded-2xl border p-4 flex flex-col space-y-4 min-h-[500px] transition-colors duration-200", col.color)}
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    {col.title}
                  </span>
                  <span className="h-5 w-5 rounded-full bg-harbor-surfaceAlt text-muted-foreground flex items-center justify-center text-[10px] font-semibold border border-border">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      No tasks in this column.
                    </div>
                  )}

                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="harbor-card p-4 space-y-3 cursor-pointer hover:-translate-y-0.5 hover:border-primary/35 transition-all duration-200 group"
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
                          <span className="flex items-center space-x-1 text-[10px] text-emerald-300 bg-harbor-success/10 px-1.5 py-0.5 rounded-full border border-harbor-success/20">
                            <MessageSquare className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-indigo-200 transition-colors">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] text-muted-foreground">
                        {task.dueDate ? (
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatTaskDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center space-x-2">
                          <select
                            value={task.status}
                            disabled={mutatingTaskId === task.id}
                            onChange={(e) =>
                              handleStatusChange(task.id, e.target.value as TaskStatus)
                            }
                            className="bg-harbor-surfaceAlt text-harbor-secondary border border-border rounded-lg px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-primary/50"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="text-muted-foreground hover:text-indigo-300 p-1 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={mutatingTaskId === task.id}
                            className="text-muted-foreground hover:text-red-300 p-1 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
        <div className="harbor-card p-5 space-y-3">
          <div className="divide-y divide-border">
            {filteredTasks.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No tasks found. Create your first task or sync from WhatsApp!
              </div>
            )}

            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-harbor-surfaceAlt rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-foreground">{task.title}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider",
                        getPriorityBadge(task.priority)
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <select
                    value={task.status}
                    disabled={mutatingTaskId === task.id}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value as TaskStatus)
                    }
                    className="bg-harbor-surfaceAlt text-harbor-secondary border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary/50"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openEditModal(task)}
                    className="text-muted-foreground hover:text-indigo-300 p-1 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={mutatingTaskId === task.id}
                    className="text-muted-foreground hover:text-red-300 p-1 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
}
