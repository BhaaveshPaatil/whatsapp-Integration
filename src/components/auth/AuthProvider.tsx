"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import {
  provisionalProfile,
  subscribeToAuthChanges,
} from "@/lib/services/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setOrganization, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    let settled = false;

    const failOpenTimeout = window.setTimeout(() => {
      if (settled) return;

      const current = useAuthStore.getState().user;
      const firebaseUser = auth.currentUser;

      // Never mark logged-out while Firebase still has a session.
      if (!current && firebaseUser) {
        console.warn(
          "Auth profile sync timed out; continuing with Firebase session."
        );
        setUser(provisionalProfile(firebaseUser));
        setLoading(false);
        return;
      }

      if (!current && !firebaseUser) {
        console.warn(
          "Firebase auth sync timed out. Continuing without an active session."
        );
        setUser(null);
        setOrganization(null);
        setLoading(false);
        return;
      }

      setLoading(false);
    }, 12000);

    const unsubscribe = subscribeToAuthChanges((user, organization) => {
      settled = true;
      window.clearTimeout(failOpenTimeout);

      // Avoid clobbering a richer in-memory session with an empty provisional
      // when Firebase briefly re-emits during navigation / token refresh.
      const current = useAuthStore.getState().user;
      if (
        user &&
        current &&
        current.uid === user.uid &&
        current.orgId &&
        !user.orgId
      ) {
        setLoading(false);
        return;
      }

      setUser(user);
      setOrganization(organization);
      setLoading(false);
    });

    return () => {
      settled = true;
      window.clearTimeout(failOpenTimeout);
      unsubscribe();
    };
  }, [setUser, setOrganization, setLoading]);

  return <>{children}</>;
}
