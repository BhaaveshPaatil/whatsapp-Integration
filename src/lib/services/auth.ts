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
import { acceptPendingInviteForUser } from "./team";
import { UserProfile, Organization } from "@/types";

const googleProvider = new GoogleAuthProvider();

async function applyPendingInvite(userProfile: UserProfile): Promise<UserProfile> {
  if (userProfile.orgId) return userProfile;

  const invite = await acceptPendingInviteForUser(
    userProfile.email,
    userProfile.uid,
    userProfile.displayName
  );

  if (!invite) return userProfile;

  return {
    ...userProfile,
    orgId: invite.orgId,
    role: invite.role,
    updatedAt: new Date().toISOString(),
  };
}

export async function signUpWithEmail(
  displayName: string,
  email: string,
  pass: string
): Promise<{ user: UserProfile }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  let userProfile = await createUserProfile(
    cred.user.uid,
    email.toLowerCase(),
    displayName
  );
  userProfile = await applyPendingInvite(userProfile);
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
      (cred.user.email || email).toLowerCase(),
      cred.user.displayName || "User"
    );
  }

  userProfile = await applyPendingInvite(userProfile);

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
        (cred.user.email || "").toLowerCase(),
        cred.user.displayName || "User",
        cred.user.photoURL || undefined
      );
    }

    userProfile = await applyPendingInvite(userProfile);

    const organization = userProfile.orgId
      ? await getOrganization(userProfile.orgId)
      : null;

    return { user: userProfile, organization };
  } catch (error: any) {
    console.warn("Pop-up auth encountered an issue/CSP restriction. Falling back to signInWithRedirect...", error);
    // If pop-up is blocked, closed, or encounters CSP inline script restrictions, fall back to redirect
    await signInWithRedirect(auth, googleProvider);
    // Return dummy promise that will be resolved upon redirect return
    return new Promise(() => {});
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
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
        (cred.user.email || "").toLowerCase(),
        cred.user.displayName || "User",
        cred.user.photoURL || undefined
      );
    }

    userProfile = await applyPendingInvite(userProfile);

    const organization = userProfile.orgId
      ? await getOrganization(userProfile.orgId)
      : null;

    return { user: userProfile, organization };
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
      let userProfile = await getUserProfile(firebaseUser.uid);
      if (!userProfile) {
        userProfile = await createUserProfile(
          firebaseUser.uid,
          (firebaseUser.email || "").toLowerCase(),
          firebaseUser.displayName || "User",
          firebaseUser.photoURL || undefined
        );
      }

      userProfile = await applyPendingInvite(userProfile);

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
