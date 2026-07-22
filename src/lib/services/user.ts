import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

const USERS_COLLECTION = "users";

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const now = new Date().toISOString();

  const newUser: UserProfile = {
    uid,
    email,
    displayName,
    role: "admin", // Default for first user creating org, will be refined in onboarding
    orgId: "",
    photoURL: photoURL || "",
    phoneNumber: "",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(userRef, newUser, { merge: true });
  return newUser;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}
