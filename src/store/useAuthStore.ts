import { create } from "zustand";
import { UserProfile, Organization } from "@/types";

interface AuthState {
  user: UserProfile | null;
  organization: Organization | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, organization: null, isLoading: false }),
}));
