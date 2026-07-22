"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
          <p className="text-xs font-medium">Loading TaskFlow AI Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground relative selection:bg-indigo-500/30 transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">{children}</main>
      </div>
    </div>
  );
}
