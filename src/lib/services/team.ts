import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { UserProfile, Team, UserRole } from "@/types";

const USERS_COLLECTION = "users";
const TEAMS_COLLECTION = "teams";

export async function getOrganizationMembers(orgId: string): Promise<UserProfile[]> {
  if (!orgId) return [];
  const q = query(collection(db, USERS_COLLECTION), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data() as UserProfile);
}

export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { role: newRole, updatedAt: new Date().toISOString() });
}

export async function createTeam(orgId: string, name: string): Promise<Team> {
  const now = new Date().toISOString();
  const teamRef = await addDoc(collection(db, TEAMS_COLLECTION), {
    orgId,
    name,
    memberIds: [],
    createdAt: now,
  });

  return {
    id: teamRef.id,
    orgId,
    name,
    memberIds: [],
    createdAt: now,
  };
}
