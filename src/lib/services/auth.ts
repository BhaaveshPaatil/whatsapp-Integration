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
googleProvider.setCustomParameters({ prompt: "select_account" });
googleProvider.addScope("email");
googleProvider.addScope("profile");

export type AuthSession = {
  user: UserProfile;
  organization: Organization | null;
};

/**
 * Resolve Firestore profile for an authenticated Firebase user.
 * Intentionally does NOT touch organizationInvites — that query historically
 * required a composite index and blocked Google login. Invites are applied
 * after sign-in via `syncPendingInviteAfterAuth`.
 */
async function resolveSession(firebaseUser: FirebaseUser): Promise<AuthSession> {
  let userProfile = await getUserProfile(firebaseUser.uid);

  if (!userProfile) {
    userProfile = await createUserProfile(
      firebaseUser.uid,
      (firebaseUser.email || "").toLowerCase(),
      firebaseUser.displayName || "User",
      firebaseUser.photoURL || undefined
    );
  }

  const organization = userProfile.orgId
    ? await getOrganization(userProfile.orgId)
    : null;

  return { user: userProfile, organization };
}

function postAuthPath(user: UserProfile): "/onboarding" | "/dashboard" {
  return user.orgId ? "/dashboard" : "/onboarding";
}

export { postAuthPath };

/** Apply pending org invite after login (non-blocking if it fails). */
export async function syncPendingInviteAfterAuth(
  user: UserProfile
): Promise<AuthSession | null> {
  if (user.orgId) return null;

  try {
    const { acceptPendingInviteForUser } = await import("./team");
    const invite = await acceptPendingInviteForUser(
      user.email,
      user.uid,
      user.displayName
    );
    if (!invite) return null;

    const updated: UserProfile = {
      ...user,
      orgId: invite.orgId,
      role: invite.role,
      updatedAt: new Date().toISOString(),
    };
    const organization = await getOrganization(invite.orgId);
    return { user: updated, organization };
  } catch (error) {
    console.warn("Pending invite sync skipped:", error);
    return null;
  }
}

export async function signUpWithEmail(
  displayName: string,
  email: string,
  pass: string
): Promise<AuthSession> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const userProfile = await createUserProfile(
    cred.user.uid,
    email.toLowerCase(),
    displayName
  );
  return { user: userProfile, organization: null };
}

export async function signInWithEmail(
  email: string,
  pass: string
): Promise<AuthSession> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return resolveSession(cred.user);
}

export async function signInWithGoogle(): Promise<AuthSession> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return await resolveSession(cred.user);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return new Promise(() => {});
    }

    if (code === "auth/popup-closed-by-user" || code === "auth/user-cancelled") {
      throw error;
    }

    throw error;
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function checkRedirectResult(): Promise<AuthSession | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (!cred?.user) return null;
    return await resolveSession(cred.user);
  } catch (error) {
    console.error("Error in checkRedirectResult:", error);
    throw error;
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
      const session = await resolveSession(firebaseUser);
      onAuthChange(session.user, session.organization);
    } catch (error) {
      console.error("Error fetching user profile during auth sync:", error);
      onAuthChange(
        {
          uid: firebaseUser.uid,
          email: (firebaseUser.email || "").toLowerCase(),
          displayName: firebaseUser.displayName || "User",
          role: "admin",
          orgId: "",
          photoURL: firebaseUser.photoURL || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        null
      );
    }
  });
}
