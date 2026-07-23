"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { InviteMemberInput } from "@/lib/validations/team";
import {
  inviteOrganizationMember,
  removeOrganizationMember,
  revokeOrganizationInvite,
  subscribeToOrganizationTeam,
  updateUserRole,
} from "@/lib/services/team";
import { isOrgAdmin } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { TeamMember, UserRole } from "@/types";
import { Users, UserPlus, Mail, Search, Trash2, Loader2 } from "lucide-react";

export default function TeamPage() {
  const { user, organization } = useAuthStore();
  const isAdmin = isOrgAdmin(user);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingMemberId, setMutatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    const unsubscribe = subscribeToOrganizationTeam(
      organization.id,
      (orgMembers) => {
        setMembers(orgMembers);
        setIsLoading(false);
      },
      (teamError) => {
        setError(teamError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [organization?.id]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.displayName.toLowerCase().includes(normalizedQuery) ||
        member.email.toLowerCase().includes(normalizedQuery)
    );
  }, [members, searchQuery]);

  const handleInviteMember = async (data: InviteMemberInput) => {
    if (!organization?.id || !user?.uid || !isAdmin) {
      setError("Only organization admins can invite members.");
      return;
    }

    try {
      setError(null);
      await inviteOrganizationMember({
        orgId: organization.id,
        email: data.email,
        role: data.role,
        invitedBy: user.uid,
      });
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invitation.");
      throw inviteError;
    }
  };

  const handleRoleChange = async (member: TeamMember, role: UserRole) => {
    if (!organization?.id || !member.uid || !isAdmin) return;

    try {
      setError(null);
      setMutatingMemberId(member.id);
      await updateUserRole(member.uid, organization.id, role);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Unable to update member role.");
    } finally {
      setMutatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!isAdmin) return;
    const shouldRemove = window.confirm(
      member.status === "pending" ? "Revoke this invitation?" : "Remove this member?"
    );
    if (!shouldRemove) return;

    try {
      setError(null);
      setMutatingMemberId(member.id);
      if (member.status === "pending" && member.inviteId) {
        await revokeOrganizationInvite(member.inviteId);
      } else if (member.uid && organization?.id) {
        await removeOrganizationMember(member.uid, organization.id);
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to update member.");
    } finally {
      setMutatingMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-300" />
            <span>Team & Members</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage organization members, assign roles, and control access permissions.
          </p>
        </div>

        {isAdmin && (
          <Button onClick={() => setIsInviteOpen(true)} className="space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite Team Member</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs text-red-300 bg-harbor-danger/10 border border-harbor-danger/25 rounded-xl">
          {error}
        </div>
      )}

      {/* Member List */}
      <div className="harbor-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="harbor-input w-full pl-9"
            />
          </div>

          <span className="text-xs text-muted-foreground font-medium">
            {members.length} Members
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {isLoading && (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-indigo-300" />
              Loading team members...
            </div>
          )}

          {!isLoading && filteredMembers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No team members found.
            </div>
          )}

          {!isLoading && filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-3.5 hover:bg-harbor-surfaceAlt px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-sm font-semibold text-indigo-200">
                  {member.displayName ? member.displayName[0].toUpperCase() : "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{member.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {isAdmin && member.status === "active" && member.uid !== user?.uid ? (
                  <select
                    value={member.role}
                    disabled={mutatingMemberId === member.id}
                    onChange={(event) => handleRoleChange(member, event.target.value as UserRole)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize bg-transparent focus:outline-none ${member.role === "admin"
                      ? "text-indigo-400 border-indigo-500/30"
                      : "text-harbor-secondary border-border"
                      }`}
                  >
                    <option value="admin">admin</option>
                    <option value="team_member">team member</option>
                  </select>
                ) : (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${member.role === "admin"
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                      : "bg-harbor-surfaceAlt text-harbor-secondary border-border"
                      }`}
                  >
                    {member.status === "pending" ? "pending" : member.role.replace("_", " ")}
                  </span>
                )}

                {isAdmin && member.uid !== user?.uid && (
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={mutatingMemberId === member.id}
                    className="text-muted-foreground hover:text-red-300 p-1 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSubmit={handleInviteMember}
      />
    </div>
  );
}
