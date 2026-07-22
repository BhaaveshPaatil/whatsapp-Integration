"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { signInWithEmail, signInWithGoogle, checkRedirectResult } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Zap, Loader2, LogIn } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    // Check if user is returning from a Google redirect auth fallback
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
      .catch((err) => {
        console.error("Redirect auth error:", err);
      });
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setError(null);
      setIsSubmitting(true);
      const { user } = await signInWithEmail(data.email, data.password);
      if (!user.orgId) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
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
      if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
        setError("Browser popup was blocked. Redirecting to Google Sign-In...");
      } else {
        setError(err?.message || "Google sign-in failed.");
      }
    } finally {
      setIsSubmitting(false);
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
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Sign in to your TaskFlow AI workspace</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email Address</label>
              <input
                type="email"
                placeholder="name@organization.com"
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

            <Button type="submit" variant="harbor" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
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
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="text-indigo-500 dark:text-indigo-400 hover:underline">
              Create one now
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
