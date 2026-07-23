import type { Timestamp } from "firebase/firestore";

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
  updatedAt?: string;
  whatsappConfigured: boolean;
  aiConfigured: boolean;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  geminiApiKey?: string;
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
  createdBy: string;
  dueDate?: Timestamp | null;
  labels?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface OrganizationInvite {
  id: string;
  orgId: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface TeamMember {
  id: string;
  uid?: string;
  inviteId?: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: "active" | "pending";
  orgId: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: "task_assigned" | "whatsapp_message" | "comment" | "ai_extraction" | "needs_review";
  createdAt: string;
  orgId?: string;
  relatedId?: string;
}

/** Channel-agnostic inbound message after connector normalize() */
export type MessageSource = "whatsapp" | "email" | "slack" | "teams" | "telegram" | "discord" | "manual";

export type InboundMessageStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "ignored"
  | "needs_review"
  | "duplicate";

export type InboundMessageType = "text" | "image" | "audio" | "document" | "video" | "unknown";

export interface InboundMessage {
  id: string;
  orgId: string;
  source: MessageSource;
  externalId: string;
  sender: string;
  senderName?: string;
  text: string;
  normalizedText: string;
  type: InboundMessageType;
  status: InboundMessageStatus;
  contentHash: string;
  phoneNumberId?: string;
  conversationId?: string;
  rawPayload?: Record<string, unknown>;
  attachmentRefs?: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

export interface ProcessingQueueItem {
  id: string;
  orgId: string;
  messageId: string;
  attempts: number;
  maxAttempts: number;
  status: QueueJobStatus;
  lastError?: string;
  scheduledAt: string;
  lockedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AiIntent =
  | "create_task"
  | "update_task"
  | "close_task"
  | "ask_question"
  | "schedule_meeting"
  | "create_note"
  | "ignore";

export type AiExtractionOutcome =
  | "auto_created"
  | "updated_existing"
  | "needs_review"
  | "ignored"
  | "duplicate"
  | "failed";

export interface StructuredAiAction {
  intent: AiIntent;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  assigneeName?: string;
  labels?: string[];
  confidenceScore: number;
  relatedTaskHint?: string;
}

export interface AiExtractionRecord {
  id: string;
  orgId: string;
  messageId: string;
  model: string;
  inputText: string;
  action: StructuredAiAction;
  outcome: AiExtractionOutcome;
  taskId?: string;
  latencyMs: number;
  createdAt: string;
}

export type AnalyticsEventType =
  | "message_received"
  | "message_queued"
  | "ai_extraction"
  | "task_created"
  | "task_updated"
  | "task_assigned"
  | "task_completed"
  | "needs_review"
  | "duplicate_detected"
  | "processing_failed";

export interface AnalyticsEvent {
  id: string;
  orgId: string;
  type: AnalyticsEventType;
  messageId?: string;
  taskId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  orgId: string;
  source: MessageSource;
  externalThreadKey: string;
  participant: string;
  lastMessageAt: string;
  recentMessageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConnection {
  id: string;
  orgId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifyToken?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingLog {
  id: string;
  orgId: string;
  messageId: string;
  stage: string;
  level: "info" | "warn" | "error";
  detail: string;
  createdAt: string;
}
