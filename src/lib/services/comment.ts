import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

const COMMENTS_COLLECTION = "task_comments";

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const q = query(collection(db, COMMENTS_COLLECTION), where("taskId", "==", taskId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskComment));
}

export async function addComment(
  taskId: string,
  userId: string,
  userName: string,
  content: string
): Promise<TaskComment> {
  const now = new Date().toISOString();
  const comment = {
    taskId,
    userId,
    userName,
    content,
    createdAt: now,
  };
  const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), comment);
  return { id: docRef.id, ...comment };
}
