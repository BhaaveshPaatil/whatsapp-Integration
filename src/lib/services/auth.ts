import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { createUserProfile, getUserProfile } from "./user";
import { getOrganization } from "./organization";
import { UserProfile, Organization } from "@/types";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signUpWithEmail(
  displayName: string,
  email: string,
  pass: string
): Promise<{ user: UserProfile }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const userProfile = await createUserProfile(
    cred.user.uid,
    email,
    displayName
  );
  return { user: userProfile };
}

export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: UserProfile; organization: Organization | null }> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  let userProfile = await getUserProfile(cred.user.uid);

  if (!userProfile) {
    userProfile = await createUserProfile(
      cred.user.uid,
      cred.user.email || email,
      cred.user.displayName || "User"
    );
  }

  const organization = userProfile.orgId
    ? await getOrganization(userProfile.orgId)
    : null;

  return { user: userProfile, organization };
}

export async function signInWithGoogle(): Promise<{
  user: UserProfile;
  organization: Organization | null;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    let userProfile = await getUserProfile(cred.user.uid);

    if (!userProfile) {
      userProfile = await createUserProfile(
        cred.user.uid,
        cred.user.email || "",
        cred.user.displayName || "User",
        cred.user.photoURL || undefined
      );
    }

    const organization = userProfile.orgId
      ? await getOrganization(userProfile.orgId)
      : null;

    return { user: userProfile, organization };
  } catch (error: any) {
    // Fallback to redirect if pop-up is blocked by browser or mobile policy
    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/cancelled-popup-request" ||
      error?.code === "auth/popup-closed-by-user"
    ) {
      console.warn("Pop-up window issue, falling back to signInWithRedirect...");
      await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
}

export async function checkRedirectResult(): Promise<{
  user: UserProfile;
  organization: Organization | null;
} | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (!cred) return null;

    let userProfile = await getUserProfile(cred.user.uid);
    if (!userProfile) {
      userProfile = await createUserProfile(
        cred.user.uid,
        cred.user.email || "",
        cred.user.displayName || "User",
        cred.user.photoURL || undefined
      );
    }

    const organization = userProfile.orgId
      ? await getOrganization(userProfile.orgId)
      : null;

    return { user: userProfile, organization };
  } catch (err) {
    console.error("Error checking redirect result:", err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(
  onAuthChange: (
    user: UserProfile | null,
    organization: Organization | null
  ) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      onAuthChange(null, null);
      return;
    }

    try {
      let userProfile = await getUserProfile(firebaseUser.uid);
      if (!userProfile) {
        userProfile = await createUserProfile(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName || "User",
          firebaseUser.photoURL || undefined
        );
      }

      const organization = userProfile.orgId
        ? await getOrganization(userProfile.orgId)
        : null;

      onAuthChange(userProfile, organization);
    } catch (error) {
      console.error("Error fetching user profile during auth sync:", error);
      onAuthChange(null, null);
    }
  });
}
