"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus, TaskPriority, TeamMember } from "@/types";
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
import { subscribeToOrganizationTeam } from "@/lib/services/team";
import { canAssignTasks } from "@/lib/rbac";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Edit2,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Timestamp } from "firebase/firestore";

const STATUS_TABS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "Review" },
  { id: "completed", title: "Completed" },
];

function formatDisplayDate(value?: Timestamp | null): string {
  if (!value) return "No due date";
  return value.toDate().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatPriorityLabel(priority: TaskPriority): string {
  return `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`;
}

function sourceLabel(source?: Task["source"]): string {
  if (source === "whatsapp" || source === "ai_extracted") return "WhatsApp";
  return "Manual";
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
  const canAssign = canAssignTasks(user);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeStatus, setActiveStatus] = useState<TaskStatus>("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setTasks([]);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribeTasks = subscribeToOrgTasks(
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

    const unsubscribeTeam = canAssign
      ? subscribeToOrganizationTeam(
          organization.id,
          setMembers,
          () => setMembers([])
        )
      : () => undefined;

    return () => {
      unsubscribeTasks();
      unsubscribeTeam();
    };
  }, [organization?.id, canAssign]);

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      completed: 0,
    };
    for (const task of tasks) {
      if (counts[task.status] !== undefined) counts[task.status] += 1;
    }
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status !== activeStatus) return false;
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [activeStatus, priorityFilter, searchQuery, tasks]);

  const resolveAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return "";
    const member = members.find((m) => m.uid === assigneeId);
    return member?.displayName || "";
  };

  const handleSaveTask = async (data: TaskInput) => {
    if (!organization?.id || !user?.uid) {
      setError("Organization or user session is missing.");
      return;
    }

    try {
      setError(null);
      const assigneeId = canAssign ? data.assigneeId || "" : editingTask?.assigneeId || "";
      const assigneeName = canAssign
        ? resolveAssigneeName(data.assigneeId)
        : editingTask?.assigneeName || "";
      const taskPayload = {
        title: data.title,
        description: data.description || "",
        priority: data.priority,
        status: data.status,
        assigneeId,
        assigneeName,
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
      setError(
        statusError instanceof Error ? statusError.message : "Unable to update task status."
      );
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-indigo-300" />
            <span>Task Management</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Switch status tabs, assign teammates, and track WhatsApp-sourced work.
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

      <div className="grid grid-cols-2 gap-3 max-w-xl">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.id];
          const isActive = activeStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-harbor-surface/70 text-muted-foreground hover:border-primary/25 hover:text-foreground"
              )}
            >
              <span className="text-sm font-semibold">
                {tab.title} ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="harbor-card p-4 flex flex-col sm:flex-row items-center gap-4">
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

        <div className="flex items-center space-x-2 w-full sm:w-auto">
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

      {isLoading ? (
        <div className="harbor-card p-8 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-indigo-300" />
          Loading tasks...
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {filteredTasks.length === 0 && (
            <div className="harbor-card p-8 text-center text-muted-foreground text-xs">
              No tasks in {STATUS_TABS.find((t) => t.id === activeStatus)?.title}. Create one or
              move a task into this status.
            </div>
          )}

          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="harbor-card p-5 space-y-3 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {task.title}
                </h3>
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEditModal(task)}
                    className="text-muted-foreground hover:text-indigo-300 p-1"
                    aria-label="Edit task"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={mutatingTaskId === task.id}
                    className="text-muted-foreground hover:text-red-300 p-1 disabled:opacity-50"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{formatDisplayDate(task.dueDate)}</p>
                <p>{formatPriorityLabel(task.priority)}</p>
                <p className="flex items-center gap-1.5">
                  {(task.source === "whatsapp" || task.source === "ai_extracted") && (
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-300" />
                  )}
                  <span>{sourceLabel(task.source)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  <span>{task.assigneeName || "Unassigned"}</span>
                </p>
              </div>

              <div className="pt-2">
                <select
                  value={task.status}
                  disabled={mutatingTaskId === task.id}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  className="harbor-input text-xs w-full sm:w-auto"
                >
                  <option value="todo">Move to To Do</option>
                  <option value="in_progress">Move to In Progress</option>
                  <option value="in_review">Move to Review</option>
                  <option value="completed">Move to Completed</option>
                </select>
              </div>
            </div>
          ))}
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
        members={members}
        canAssign={canAssign}
      />
    </div>
  );
}
