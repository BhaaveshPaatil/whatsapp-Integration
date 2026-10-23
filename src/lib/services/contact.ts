import { db } from "@/lib/firebase";
import type { Contact } from "@/types";
import {
  collection,
  onSnapshot,
  query,
  where,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";

function createdAtMillis(contact: Contact): number {
  const parsed = contact.createdAt ? Date.parse(contact.createdAt) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Accept either an ISO string or a Firestore Timestamp and normalize to ISO. */
function toIsoString(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;

  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      try {
        const date = (toDate as () => Date).call(value);
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

export function mapContactDoc(
  snapshot: { id: string; data: () => Record<string, unknown> }
): Contact {
  const data = snapshot.data();
  return {
    ...(data as unknown as Contact),
    id: (data.id as string) || snapshot.id,
    createdAt: toIsoString(data.createdAt) || "",
    updatedAt: toIsoString(data.updatedAt) || "",
    skills: Array.isArray(data.skills)
      ? (data.skills as unknown[]).filter(
          (skill): skill is string => typeof skill === "string"
        )
      : undefined,
    verifiedFields: Array.isArray(data.verifiedFields)
      ? (data.verifiedFields as string[])
      : [],
  };
}

/**
 * Live subscription to contacts for one organization.
 * Query is org-scoped so Firestore rules enforce tenant isolation; sorting is
 * done client-side to avoid requiring an extra composite index.
 */
export function subscribeToOrgContacts(
  orgId: string,
  onData: (contacts: Contact[]) => void,
  onError: (error: Error) => void,
  max = 500
): Unsubscribe {
  const contactsQuery = query(
    collection(db, "contacts"),
    where("orgId", "==", orgId)
  );

  return onSnapshot(
    contactsQuery,
    (snapshot) => {
      const rows = snapshot.docs
        .map(mapContactDoc)
        .sort((a, b) => createdAtMillis(b) - createdAtMillis(a))
        .slice(0, max);
      onData(rows);
    },
    (error: FirestoreError) => {
      console.error("Contact subscription failed:", error.code, error.message);
      const hint =
        error.code === "permission-denied"
          ? "Firestore permission denied for contacts."
          : error.message;
      onError(new Error(`Unable to keep contacts in sync. ${hint}`));
    }
  );
}
