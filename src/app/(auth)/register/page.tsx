"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { signUpWithEmail, signInWithGoogle, checkRedirectResult } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Zap, Loader2, UserPlus, AlertTriangle, ExternalLink, Copy, Check } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 20,
        scale: 0.98,
        duration: 0.45,
        ease: "power2.out",
      });
    },
    { scope: cardRef }
  );

  useEffect(() => {
    checkRedirectResult()
      .then((res) => {
        if (res?.user) {
          if (!res.user.orgId) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        }
      })
      .catch((err: any) => {
        if (err?.code === "auth/unauthorized-domain") {
          const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
          setUnauthorizedDomain(currentHost);
          setError(
            `Firebase Auth is blocking domain: ${currentHost}. Add this exact domain to Firebase Authorized Domains.`
          );
        } else {
          console.error("Redirect auth error:", err);
        }
      });
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setError(null);
      setUnauthorizedDomain(null);
      setIsSubmitting(true);
      await signUpWithEmail(data.displayName, data.email, data.password);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setUnauthorizedDomain(null);
      setIsSubmitting(true);
      const res = await signInWithGoogle();
      if (res?.user) {
        if (!res.user.orgId) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      if (err?.code === "auth/unauthorized-domain") {
        const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
        setUnauthorizedDomain(currentHost);
        setError(`Firebase Auth blocked authentication on: ${currentHost}`);
      } else if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
        setError("Browser popup was blocked. Redirecting to Google Sign-In...");
      } else {
        setError(err?.message || "Google sign-in failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground transition-colors duration-200 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card ref={cardRef} className="w-full max-w-md harbor-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 mb-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Get started with TaskFlow AI in seconds</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {unauthorizedDomain && (
            <div className="p-4 text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-2 font-semibold text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Action Required: Authorize Domain</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Firebase is blocking authentication for your current Vercel URL:
              </p>
              <div className="flex items-center justify-between bg-background/80 px-3 py-1.5 rounded-lg border border-amber-500/20 text-xs font-mono">
                <span className="truncate mr-2 font-bold">{unauthorizedDomain}</span>
                <button
                  type="button"
                  onClick={copyDomain}
                  className="flex items-center space-x-1 text-[10px] font-sans px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <a
                href="https://console.firebase.google.com/project/whatsapp-taskflow/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline pt-1"
              >
                <span>Open Firebase Authorized Domains</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {error && !unauthorizedDomain && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Full Name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                {...register("displayName")}
                className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-indigo-500/50"
              />
              {errors.displayName && (
                <p className="text-[11px] text-rose-500">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email Address</label>
              <input
                type="email"
                placeholder="alex@company.com"
                {...register("email")}
                className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-indigo-500/50"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-indigo-500/50"
              />
              {errors.password && (
                <p className="text-[11px] text-rose-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-indigo-500/50"
              />
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" variant="harbor" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register & Continue</span>
                </>
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-3 text-[10px] text-muted-foreground uppercase tracking-wider absolute">OR</span>
          </div>

          <Button
            variant="secondary"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full"
          >
            Sign up with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-500 dark:text-indigo-400 hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
