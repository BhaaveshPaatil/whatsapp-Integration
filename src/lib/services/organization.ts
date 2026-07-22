import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Organization } from "@/types";
import { updateUserProfile } from "./user";

const ORGS_COLLECTION = "organizations";

export async function createOrganization(
  name: string,
  ownerId: string
): Promise<Organization> {
  const orgId = "org_" + Math.random().toString(36).substring(2, 9);
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const now = new Date().toISOString();

  const newOrg: Organization = {
    id: orgId,
    name,
    slug,
    ownerId,
    createdAt: now,
    whatsappConfigured: false,
    aiConfigured: false,
  };

  const orgRef = doc(db, ORGS_COLLECTION, orgId);
  await setDoc(orgRef, newOrg);

  // Update user with orgId and admin role
  await updateUserProfile(ownerId, {
    orgId,
    role: "admin",
  });

  return newOrg;
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (!orgId) return null;
  const orgRef = doc(db, ORGS_COLLECTION, orgId);
  const snap = await getDoc(orgRef);
  if (snap.exists()) {
    return snap.data() as Organization;
  }
  return null;
}
