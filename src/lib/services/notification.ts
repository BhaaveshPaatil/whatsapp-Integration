import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { NotificationItem } from "@/types";

const NOTIFICATIONS_COLLECTION = "notifications";

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  const q = query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const ref = doc(db, NOTIFICATIONS_COLLECTION, id);
  await updateDoc(ref, { read: true });
}
