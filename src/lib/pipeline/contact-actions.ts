import { getAdminDb } from "@/lib/firebase-admin";
import type { Contact } from "@/types";

/**
 * Create or update a contact record in Firestore.
 * Duplicate detection by phone number within the same org.
 * Preserves human-verified fields — AI values only fill blanks.
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

  // Duplicate detection: match by phone within org
  if (input.phone) {
    const existing = await db
      .collection("contacts")
      .where("orgId", "==", input.orgId)
      .where("phone", "==", input.phone)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
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
    phone: input.phone,
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
