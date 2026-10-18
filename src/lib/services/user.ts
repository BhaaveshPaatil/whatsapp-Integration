
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { UserProfile } from "@/types";

const USERS_COLLECTION = "users";

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const userRef = doc(db, USERS_COLLECTION, uid);
  const now = new Date().toISOString();

  const newUser: UserProfile = {
    uid,
    email: normalizedEmail,
    displayName: displayName.trim() || "User",
    role: "team_member",
    orgId: "",
    photoURL: photoURL || "",
    phoneNumber: "",
    createdAt: now,
    updatedAt: now,
  };

  // Create the initial profile without overwriting an existing profile.
  await setDoc(userRef, newUser, { merge: false });

  return newUser;
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const allowedFields = [
    "displayName",
    "photoURL",
    "phoneNumber",
  ] as const;

  const safeUpdates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return;
  }

  safeUpdates.updatedAt = new Date().toISOString();

  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, safeUpdates);
}
