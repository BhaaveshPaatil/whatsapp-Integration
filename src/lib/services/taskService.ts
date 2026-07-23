import { db } from "@/lib/firebase";
import { Task, TaskPriority, TaskStatus } from "@/types";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

const TASKS_COLLECTION = "tasks";

export interface CreateTaskInput {
  orgId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdBy: string;
  source?: Task["source"];
  labels?: string[];
}

export type UpdateTaskInput = Partial<
  Pick<
    CreateTaskInput,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assigneeId"
    | "assigneeName"
    | "dueDate"
    | "source"
    | "labels"
  >
>;

function parseDueDate(dueDate?: string): Timestamp | null {
  if (!dueDate) return null;
  const date = new Date(`${dueDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function mapTaskDoc(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): Task {
  const data = snapshot.data();
  if (!data) {
    throw new Error("Task document is missing data.");
  }

  return {
    id: data.id || snapshot.id,
    orgId: data.orgId,
    title: data.title,
    description: data.description || "",
    status: data.status,
    priority: data.priority,
    assigneeId: data.assigneeId || "",
    assigneeName: data.assigneeName || "",
    dueDate: data.dueDate || null,
    createdBy: data.createdBy,
    labels: data.labels || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    source: data.source,
  };
}

function createdAtMillis(task: Task): number {
  const value = task.createdAt as { toMillis?: () => number; seconds?: number } | string | null;
  if (!value) return 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function sortTasksByCreatedAtDesc(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
}

/** Query by org only — avoids composite-index requirement; sort client-side. */
function orgTasksQuery(orgId: string) {
  return query(collection(db, TASKS_COLLECTION), where("orgId", "==", orgId));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    const now = Timestamp.now();
    const docRef = doc(collection(db, TASKS_COLLECTION));
    const taskData = {
      id: docRef.id,
      orgId: input.orgId,
      title: input.title,
      description: input.description || "",
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId || "",
      assigneeName: input.assigneeName || "",
      dueDate: parseDueDate(input.dueDate),
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      labels: input.labels || [],
      source: input.source || "manual",
    };

    await setDoc(docRef, taskData);

    return taskData;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Unable to create task. Please try again.");
  }
}

export async function getTasksByOrg(orgId: string): Promise<Task[]> {
  if (!orgId) return [];

  try {
    const snapshot = await getDocs(orgTasksQuery(orgId));
    return sortTasksByCreatedAtDesc(snapshot.docs.map(mapTaskDoc));
  } catch (error) {
    console.error("Failed to load organization tasks:", error);
    throw new Error("Unable to load tasks. Please try again.");
  }
}

export async function getTask(taskId: string): Promise<Task | null> {
  if (!taskId) return null;

  try {
    const snapshot = await getDoc(doc(db, TASKS_COLLECTION, taskId));
    if (!snapshot.exists()) return null;
    return mapTaskDoc(snapshot);
  } catch (error) {
    console.error("Failed to load task:", error);
    throw new Error("Unable to load task. Please try again.");
  }
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
  if (!taskId) return;

  try {
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description || "";
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId || "";
    if (input.assigneeName !== undefined) updates.assigneeName = input.assigneeName || "";
    if (input.dueDate !== undefined) updates.dueDate = parseDueDate(input.dueDate);
    if (input.labels !== undefined) updates.labels = input.labels;
    if (input.source !== undefined) updates.source = input.source;

    await updateDoc(doc(db, TASKS_COLLECTION, taskId), updates);
  } catch (error) {
    console.error("Failed to update task:", error);
    throw new Error("Unable to update task. Please try again.");
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!taskId) return;

  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw new Error("Unable to delete task. Please try again.");
  }
}

export function subscribeToOrgTasks(
  orgId: string,
  onTasks: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    orgTasksQuery(orgId),
    (snapshot) => onTasks(sortTasksByCreatedAtDesc(snapshot.docs.map(mapTaskDoc))),
    (error: FirestoreError) => {
      console.error("Task subscription failed:", error.code, error.message);
      const hint =
        error.code === "failed-precondition"
          ? "Missing Firestore index for tasks."
          : error.code === "permission-denied"
            ? "Firestore permission denied for tasks."
            : error.message;
      onError(new Error(`Unable to keep tasks in sync. ${hint}`));
    }
  );
}
