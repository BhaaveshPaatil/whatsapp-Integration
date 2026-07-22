"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, TaskInput } from "@/lib/validations/task";
import { Button } from "@/components/ui/button";
import { X, CheckSquare, Loader2 } from "lucide-react";
import { Task } from "@/types";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
}

export function CreateTaskModal({ isOpen, onClose, onCreate }: CreateTaskModalProps) {
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

  if (!isOpen) return null;

  const onSubmit = async (data: TaskInput) => {
    const newTask: Task = {
      id: "task_" + Math.random().toString(36).substring(2, 7),
      orgId: "org-1",
      creatorId: "user-1",
      title: data.title,
      description: data.description || "",
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate || "",
      labels: data.labels ? data.labels.split(",").map((l) => l.trim()) : [],
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreate(newTask);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-panel rounded-2xl p-6 border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Create New Task</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Update WhatsApp API webhook endpoints"
              {...register("title")}
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={3}
              placeholder="Add details, requirements, or links..."
              {...register("description")}
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Priority</label>
              <select
                {...register("priority")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Initial Status</label>
              <select
                {...register("status")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="text-xs font-medium text-slate-300">Due Date</label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Labels (Comma separated)</label>
              <input
                type="text"
                placeholder="Frontend, Bug, High Priority"
                {...register("labels")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
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
