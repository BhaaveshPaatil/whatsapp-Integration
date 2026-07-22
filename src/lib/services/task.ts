import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Task, TaskStatus, TaskPriority } from "@/types";

const TASKS_COLLECTION = "tasks";

export async function getOrganizationTasks(orgId: string): Promise<Task[]> {
  if (!orgId) return [];
  const q = query(collection(db, TASKS_COLLECTION), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
}

export async function createTask(
  orgId: string,
  creatorId: string,
  data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeId?: string;
    dueDate?: string;
    labels?: string[];
    source?: "manual" | "whatsapp" | "ai_extracted";
  }
): Promise<Task> {
  const now = new Date().toISOString();
  const newTask = {
    orgId,
    creatorId,
    title: data.title,
    description: data.description || "",
    priority: data.priority,
    status: data.status,
    assigneeId: data.assigneeId || "",
    dueDate: data.dueDate || "",
    labels: data.labels || [],
    source: data.source || "manual",
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
  return { id: docRef.id, ...newTask };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, { status, updatedAt: new Date().toISOString() });
}

export async function deleteTask(taskId: string): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await deleteDoc(taskRef);
}
