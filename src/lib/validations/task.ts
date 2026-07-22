import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(3, { message: "Task title must be at least 3 characters." }),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "completed"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.string().optional(), // Comma separated strings
});

export type TaskInput = z.infer<typeof taskSchema>;
