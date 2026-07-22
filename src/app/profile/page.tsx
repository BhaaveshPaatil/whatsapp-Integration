"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileInput } from "@/lib/validations/auth";
import { updateUserProfile } from "@/lib/services/user";
import { logoutUser } from "@/lib/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, Building, LogOut, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, organization, setUser, logout } = useAuthStore();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      setMessage(null);
      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
      });

      setUser({
        ...user,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
      });

      setMessage("Profile updated successfully!");
    } catch (err: any) {
      setMessage("Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-slate-400">
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg glass-panel border-slate-800">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xs text-indigo-400 hover:underline flex items-center space-x-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
              {user.role === "admin" ? "Admin" : "Team Member"}
            </span>
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <div className="h-14 w-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-indigo-400">
              {user.displayName ? user.displayName[0].toUpperCase() : <User />}
            </div>
            <div>
              <CardTitle className="text-xl">{user.displayName || "User Profile"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {message && (
            <div className="p-3 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Building className="h-3.5 w-3.5" />
                <span>Organization</span>
              </span>
              <p className="text-sm font-medium text-slate-200">
                {organization?.name || "Not assigned"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Shield className="h-3.5 w-3.5" />
                <span>Role</span>
              </span>
              <p className="text-sm font-medium text-slate-200 capitalize">
                {user.role}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Display Name</label>
              <input
                type="text"
                {...register("displayName")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.displayName && (
                <p className="text-xs text-red-400">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Phone Number (WhatsApp Sync)
              </label>
              <input
                type="text"
                placeholder="+1234567890"
                {...register("phoneNumber")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Save Changes"
                )}
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleSignOut}
                className="space-x-1"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Sign Out</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
