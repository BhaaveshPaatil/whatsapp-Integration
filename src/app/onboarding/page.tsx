"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { organizationSchema, OrganizationInput } from "@/lib/validations/auth";
import { createOrganization } from "@/lib/services/organization";
import { syncPendingInviteAfterAuth } from "@/lib/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, setOrganization } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        setCheckingInvite(false);
        return;
      }
      if (user.orgId) {
        router.replace("/dashboard");
        return;
      }

      try {
        const invited = await syncPendingInviteAfterAuth(user);
        if (cancelled) return;
        if (invited?.user.orgId) {
          setUser(invited.user);
          setOrganization(invited.organization);
          router.replace("/dashboard");
          return;
        }
      } catch {
        // ignore invite errors during onboarding
      } finally {
        if (!cancelled) setCheckingInvite(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, router, setUser, setOrganization]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
  });

  const onSubmit = async (data: OrganizationInput) => {
    if (!user) {
      setError("User session not found. Please log in again.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      const newOrg = await createOrganization(data.name, user.uid);

      setUser({ ...user, orgId: newOrg.id, role: "admin" });
      setOrganization(newOrg);

      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create organization.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking workspace access…
        </div>
      </div>
    );
  }

  return (
    <div className="tf-atmosphere flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg harbor-card border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm mb-2">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>
            Set up your organization workspace to invite team members and configure WhatsApp & AI
            automation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Organization Name</label>
              <input
                type="text"
                placeholder="Acme Corp, TechStart, Enterprise Studio..."
                {...register("name")}
                className="w-full rounded-lg bg-input border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-2">
              <div className="flex items-center space-x-2 text-primary text-xs font-semibold">
                <Sparkles className="h-4 w-4" />
                <span>Admin Role Privileges Included</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As the organization creator, you will automatically receive full Admin permissions
                to manage users, team roles, AI extractions, and WhatsApp integration settings.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Complete Setup & Go to Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
