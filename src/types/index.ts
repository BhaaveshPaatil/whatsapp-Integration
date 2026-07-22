export type UserRole = "admin" | "team_member";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  orgId: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  whatsappConfigured: boolean;
  aiConfigured: boolean;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed";

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  creatorId: string;
  dueDate?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  source?: "manual" | "whatsapp" | "ai_extracted";
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: "task_assigned" | "whatsapp_message" | "comment" | "ai_extraction";
  createdAt: string;
}
