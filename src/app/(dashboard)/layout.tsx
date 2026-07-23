"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { isAdminRoute, isOrgAdmin } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && user && isAdminRoute(pathname) && !isOrgAdmin(user)) {
      router.push("/dashboard");
    }
  }, [pathname, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">TaskFlow AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Loading workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-250 tf-dashboard-canvas">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
