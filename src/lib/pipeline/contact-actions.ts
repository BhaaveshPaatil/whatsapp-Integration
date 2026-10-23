import { getAdminDb } from "@/lib/firebase-admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { Contact } from "@/types";

/**
 * Strip formatting so "+91 98765-43210" and "919876543210" deduplicate.
 */
export function normalizePhone(phone?: string): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * Create or update a contact record in Firestore.
 * Duplicate detection by phone number within the same org.
 * Preserves human-verified fields - AI values only fill blanks.
 */
export async function upsertContact(input: {
  orgId: string;
  name: string;
  phone?: string;
  email?: string;
  qualification?: string;
  experience?: string;
  skills?: string[];
  businessName?: string;
  notes?: string;
  sourceMessageId?: string;
  sourceExtractionId?: string;
}): Promise<{ contact: Contact; isNew: boolean }> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const normalizedPhone = normalizePhone(input.phone);

  // Duplicate detection: match by normalized phone within org. Also supports
  // legacy rows that stored the raw formatted number.
  if (normalizedPhone) {
    const phoneCandidates = Array.from(
      new Set([normalizedPhone, input.phone].filter(Boolean) as string[])
    );
    let existingDoc: QueryDocumentSnapshot | null = null;

    for (const candidate of phoneCandidates) {
      const existing = await db
        .collection("contacts")
        .where("orgId", "==", input.orgId)
        .where("phone", "==", candidate)
        .limit(1)
        .get();
      if (!existing.empty) {
        existingDoc = existing.docs[0];
        break;
      }
    }

    if (existingDoc) {
      const doc = existingDoc;
      const data = doc.data() as Contact;
      const verified = new Set(data.verifiedFields || []);

      // Only update fields that aren't human-verified and are currently empty
      const updates: Record<string, unknown> = { updatedAt: now };
      if (input.name && !data.name && !verified.has("name")) updates.name = input.name;
      if (input.email && !data.email && !verified.has("email")) updates.email = input.email;
      if (input.qualification && !data.qualification && !verified.has("qualification"))
        updates.qualification = input.qualification;
      if (input.experience && !data.experience && !verified.has("experience"))
        updates.experience = input.experience;
      if (input.skills?.length && !data.skills?.length && !verified.has("skills"))
        updates.skills = input.skills;
      if (input.businessName && !data.businessName && !verified.has("businessName"))
        updates.businessName = input.businessName;
      if (input.notes) {
        updates.notes = data.notes
          ? `${data.notes}\n---\n${input.notes}`
          : input.notes;
      }

      if (Object.keys(updates).length > 1) {
        await doc.ref.update(updates);
      }

      return { contact: { ...data, ...updates } as Contact, isNew: false };
    }
  }

  // Create new contact
  const ref = db.collection("contacts").doc();
  const contact: Contact = {
    id: ref.id,
    orgId: input.orgId,
    name: input.name,
    phone: normalizedPhone || input.phone,
    email: input.email,
    qualification: input.qualification,
    experience: input.experience,
    skills: input.skills,
    businessName: input.businessName,
    notes: input.notes,
    sourceMessageId: input.sourceMessageId,
    sourceExtractionId: input.sourceExtractionId,
    verifiedFields: [],
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(contact);
  return { contact, isNew: true };
}

export async function getContactsByOrg(orgId: string, limit = 50): Promise<Contact[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("contacts")
    .where("orgId", "==", orgId)
    .limit(limit)
    .get();

  return snap.docs.map((d) => d.data() as Contact);
}
