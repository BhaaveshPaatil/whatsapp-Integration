"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, TaskInput } from "@/lib/validations/task";
import { Button } from "@/components/ui/button";
import { X, CheckSquare, Loader2 } from "lucide-react";
import type { Task } from "@/types";
import type { Timestamp } from "firebase/firestore";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskInput) => Promise<void>;
  task?: Task | null;
}

function formatDateInput(value?: Timestamp | null): string {
  if (!value) return "";
  return value.toDate().toISOString().split("T")[0];
}

export function CreateTaskModal({ isOpen, onClose, onSubmit, task }: CreateTaskModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "medium",
      status: "todo",
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "medium",
      status: task?.status || "todo",
      assigneeId: task?.assigneeId || "",
      dueDate: formatDateInput(task?.dueDate),
      labels: task?.labels?.join(", ") || "",
    });
  }, [isOpen, reset, task]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: TaskInput) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg harbor-popover rounded-2xl p-6 border border-border space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-indigo-300" />
            <h3 className="text-lg font-semibold text-foreground">
              {task ? "Edit Task" : "Create New Task"}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-harbor-secondary">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Update WhatsApp API webhook endpoints"
              {...register("title")}
              className="harbor-input w-full text-sm"
            />
            {errors.title && <p className="text-xs text-red-300">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-harbor-secondary">Description</label>
            <textarea
              rows={3}
              placeholder="Add details, requirements, or links..."
              {...register("description")}
              className="harbor-input w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Priority</label>
              <select
                {...register("priority")}
                className="harbor-input w-full text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Initial Status</label>
              <select
                {...register("status")}
                className="harbor-input w-full text-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Due Date</label>
              <input
                type="date"
                {...register("dueDate")}
                className="harbor-input w-full text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Labels (Comma separated)</label>
              <input
                type="text"
                placeholder="Frontend, Bug, High Priority"
                {...register("labels")}
                className="harbor-input w-full text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
