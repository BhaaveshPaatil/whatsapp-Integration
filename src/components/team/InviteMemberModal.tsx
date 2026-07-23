"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema, InviteMemberInput } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Loader2, CheckCircle2 } from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InviteMemberInput) => Promise<void>;
}

export function InviteMemberModal({ isOpen, onClose, onSubmit }: InviteMemberModalProps) {
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

  useEffect(() => {
    if (!isOpen) return;
    setSuccessMsg(false);
    reset({ email: "", role: "team_member" });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const handleInviteSubmit = async (data: InviteMemberInput) => {
    await onSubmit(data);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      reset();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md harbor-popover rounded-2xl p-6 border border-border space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-6 text-center space-y-2 text-emerald-300">
            <CheckCircle2 className="h-10 w-10 mx-auto" />
            <p className="text-sm font-semibold">Invitation Sent Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleInviteSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Email Address</label>
              <input
                type="email"
                placeholder="colleague@organization.com"
                {...register("email")}
                className="harbor-input w-full text-sm"
              />
              {errors.email && (
                <p className="text-xs text-red-300">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Role</label>
              <select
                {...register("role")}
                className="harbor-input w-full text-sm"
              >
                <option value="team_member">Team Member (Can create & update assigned tasks)</option>
                <option value="admin">Admin (Full access to settings, AI & WhatsApp)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
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
