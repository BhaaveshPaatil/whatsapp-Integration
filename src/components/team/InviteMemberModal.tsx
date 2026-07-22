"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema, InviteMemberInput } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Loader2, CheckCircle2 } from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (member: any) => void;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [successMsg, setSuccessMsg] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: "team_member" },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: InviteMemberInput) => {
    // Simulate sending invite email & creating placeholder member
    await new Promise((res) => setTimeout(res, 800));
    setSuccessMsg(true);
    setTimeout(() => {
      onSuccess({
        uid: "user_" + Math.random().toString(36).substring(2, 7),
        email: data.email,
        displayName: data.email.split("@")[0],
        role: data.role,
        createdAt: new Date().toISOString(),
      });
      setSuccessMsg(false);
      reset();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-6 text-center space-y-2 text-emerald-400">
            <CheckCircle2 className="h-10 w-10 mx-auto" />
            <p className="text-sm font-semibold">Invitation Sent Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                placeholder="colleague@organization.com"
                {...register("email")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <select
                {...register("role")}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="team_member">Team Member (Can create & update assigned tasks)</option>
                <option value="admin">Admin (Full access to settings, AI & WhatsApp)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
