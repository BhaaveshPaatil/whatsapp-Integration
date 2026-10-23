"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToOrgContacts } from "@/lib/services/contact";
import type { Contact } from "@/types";
import {
  Contact as ContactIcon,
  Search,
  Loader2,
  Phone,
  Mail,
  Briefcase,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "Unknown";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "Unknown";
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ContactsPage() {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToOrgContacts(
      user.orgId,
      (rows) => {
        setContacts(rows);
        setIsLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.orgId]);

  const filteredContacts = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return contacts;

    return contacts.filter((contact) => {
      const haystack = [
        contact.name,
        contact.phone,
        contact.email,
        contact.businessName,
        contact.qualification,
        contact.experience,
        ...(contact.skills || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(queryText);
    });
  }, [contacts, searchQuery]);

  const verifiedCount = useMemo(
    () => contacts.filter((contact) => (contact.verifiedFields || []).length > 0).length,
    [contacts]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <ContactIcon className="h-6 w-6 text-primary" />
            <span>Contacts</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            People and businesses extracted from inbound WhatsApp conversations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25">
            {contacts.length} total
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/25 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {verifiedCount} verified
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-harbor-danger/10 border border-harbor-danger/25 rounded-xl">
          {error}
        </div>
      )}

      <div className="harbor-card p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, phone, email, skills..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="harbor-input w-full pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="harbor-card p-8 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
          Loading contacts...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="harbor-card p-10 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-primary/60 mx-auto" />
          <p className="text-sm font-medium text-foreground">
            {contacts.length === 0 ? "No contacts yet" : "No matching contacts"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {contacts.length === 0
              ? "When the AI pipeline detects a person, candidate, or business in a WhatsApp message, the contact will appear here automatically."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => {
            const verified = new Set(contact.verifiedFields || []);
            return (
              <div
                key={contact.id}
                className="harbor-card p-5 space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                    {initials(contact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {contact.name || "Unnamed contact"}
                      </h3>
                      {verified.size > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/25 flex items-center gap-1"
                          title={`Verified fields: ${Array.from(verified).join(", ")}`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {contact.businessName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {contact.businessName}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Added {formatDate(contact.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">{contact.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">{contact.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">
                      {contact.qualification || "No qualification"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">
                      {contact.experience || "No experience recorded"}
                    </span>
                  </div>
                </div>

                {contact.skills && contact.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {contact.notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3 whitespace-pre-line line-clamp-4">
                    {contact.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
