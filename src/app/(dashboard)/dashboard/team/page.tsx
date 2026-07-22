"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ShieldCheck, Mail, Search, Trash2 } from "lucide-react";

export default function TeamPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [members, setMembers] = useState([
    {
      uid: "user-1",
      displayName: "Alex Johnson",
      email: "alex@company.com",
      role: "admin",
      status: "active",
    },
    {
      uid: "user-2",
      displayName: "Sarah Miller",
      email: "sarah@company.com",
      role: "team_member",
      status: "active",
    },
    {
      uid: "user-3",
      displayName: "David Chen",
      email: "david@company.com",
      role: "team_member",
      status: "pending",
    },
  ]);

  const handleAddMember = (newMember: any) => {
    setMembers((prev) => [...prev, newMember]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-400" />
            <span>Team & Members</span>
          </h1>
          <p className="text-xs text-slate-400">
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

      {/* Member List */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search team members..."
              className="w-full rounded-lg bg-slate-900/80 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {members.length} Members
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {members.map((member) => (
            <div
              key={member.uid}
              className="flex items-center justify-between py-3.5 hover:bg-slate-900/30 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-indigo-400">
                  {member.displayName ? member.displayName[0].toUpperCase() : "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{member.displayName}</p>
                  <p className="text-xs text-slate-500 flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{member.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${member.role === "admin"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                >
                  {member.role.replace("_", " ")}
                </span>

                {isAdmin && member.uid !== user?.uid && (
                  <button className="text-slate-500 hover:text-red-400 p-1 transition-colors">
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
        onSuccess={handleAddMember}
      />
    </div>
  );
}
