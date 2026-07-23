"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToAuthChanges } from "@/lib/services/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setOrganization, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    let settled = false;

    const failOpenTimeout = window.setTimeout(() => {
      if (settled) return;
      console.warn("Firebase auth sync timed out. Continuing without an active session.");
      // Do not clear an already-set session from a successful login race.
      const current = useAuthStore.getState().user;
      if (!current) {
        setUser(null);
        setOrganization(null);
      }
      setLoading(false);
    }, 12000);

    const unsubscribe = subscribeToAuthChanges((user, organization) => {
      settled = true;
      window.clearTimeout(failOpenTimeout);
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
