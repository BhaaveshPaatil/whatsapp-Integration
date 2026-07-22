"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToAuthChanges } from "@/lib/services/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setOrganization, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAuthChanges((user, organization) => {
      setUser(user);
      setOrganization(organization);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setOrganization, setLoading]);

  return <>{children}</>;
}
