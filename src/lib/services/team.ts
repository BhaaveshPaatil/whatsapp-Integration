import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { OrganizationInvite, Team, TeamMember, UserProfile, UserRole } from "@/types";

const USERS_COLLECTION = "users";
const TEAMS_COLLECTION = "teams";
const INVITES_COLLECTION = "organizationInvites";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapUserToMember(user: UserProfile): TeamMember {
  return {
    id: user.uid,
    uid: user.uid,
    displayName: user.displayName || user.email.split("@")[0],
    email: user.email,
    role: user.role,
    status: "active",
    orgId: user.orgId,
  };
}

function mapInviteToMember(invite: OrganizationInvite): TeamMember {
  return {
    id: invite.id,
    inviteId: invite.id,
    displayName: invite.email.split("@")[0],
    email: invite.email,
    role: invite.role,
    status: "pending",
    orgId: invite.orgId,
  };
}

export async function getOrganizationMembers(orgId: string): Promise<UserProfile[]> {
  if (!orgId) return [];
  const membersQuery = query(collection(db, USERS_COLLECTION), where("orgId", "==", orgId));
  const snapshot = await getDocs(membersQuery);
  return snapshot.docs.map((memberDoc) => memberDoc.data() as UserProfile);
}

export async function inviteOrganizationMember(input: {
  orgId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
}): Promise<OrganizationInvite> {
  const email = normalizeEmail(input.email);
  const existingUserQuery = query(
    collection(db, USERS_COLLECTION),
    where("email", "==", email),
    limit(1)
  );
  // Avoid composite indexes: filter org + status client-side
  const existingInviteQuery = query(
    collection(db, INVITES_COLLECTION),
    where("email", "==", email)
  );

  const [existingUsers, existingInvites] = await Promise.all([
    getDocs(existingUserQuery),
    getDocs(existingInviteQuery),
  ]);

  const existingUser = existingUsers.docs[0]?.data() as UserProfile | undefined;
  if (existingUser?.orgId === input.orgId) {
    throw new Error("This user is already a member of your organization.");
  }

  const existingInviteDoc = existingInvites.docs.find((inviteDoc) => {
    const data = inviteDoc.data() as OrganizationInvite;
    return data.orgId === input.orgId && data.status === "pending";
  });
  if (existingInviteDoc) {
    return { id: existingInviteDoc.id, ...existingInviteDoc.data() } as OrganizationInvite;
  }

  const inviteRef = doc(collection(db, INVITES_COLLECTION));
  const now = new Date().toISOString();
  const invite: OrganizationInvite = {
    id: inviteRef.id,
    orgId: input.orgId,
    email,
    role: input.role,
    status: "pending",
    invitedBy: input.invitedBy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(inviteRef, invite);
  return invite;
}

export async function acceptPendingInviteForUser(
  email: string,
  uid: string,
  displayName: string
): Promise<OrganizationInvite | null> {
  // Single-field query only — no composite index required for login.
  const invitesQuery = query(
    collection(db, INVITES_COLLECTION),
    where("email", "==", normalizeEmail(email))
  );
  const snapshot = await getDocs(invitesQuery);
  const pending = snapshot.docs
    .map((inviteDoc) => ({ id: inviteDoc.id, ...inviteDoc.data() }) as OrganizationInvite)
    .filter((invite) => invite.status === "pending")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const invite = pending[0];
  if (!invite) return null;

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(doc(db, USERS_COLLECTION, uid), {
    displayName,
    orgId: invite.orgId,
    role: invite.role,
    updatedAt: now,
  });
  batch.update(doc(db, INVITES_COLLECTION, invite.id), {
    status: "accepted",
    acceptedAt: now,
    acceptedBy: uid,
    updatedAt: now,
  });

  await batch.commit();
  return { ...invite, status: "accepted", acceptedAt: now, acceptedBy: uid, updatedAt: now };
}

export async function updateUserRole(uid: string, orgId: string, newRole: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { role: newRole, orgId, updatedAt: new Date().toISOString() });
}

export async function removeOrganizationMember(uid: string, orgId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    orgId: "",
    role: "team_member",
    updatedAt: new Date().toISOString(),
    removedFromOrgId: orgId,
  });
}

export async function revokeOrganizationInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, INVITES_COLLECTION, inviteId), {
    status: "revoked",
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToOrganizationTeam(
  orgId: string,
  onMembers: (members: TeamMember[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const usersQuery = query(collection(db, USERS_COLLECTION), where("orgId", "==", orgId));
  // Single equality filter — pending status filtered client-side (no composite index)
  const invitesQuery = query(
    collection(db, INVITES_COLLECTION),
    where("orgId", "==", orgId)
  );

  let activeMembers: TeamMember[] = [];
  let pendingMembers: TeamMember[] = [];

  const emit = () => {
    onMembers([...activeMembers, ...pendingMembers]);
  };

  const unsubscribeUsers = onSnapshot(
    usersQuery,
    (snapshot) => {
      activeMembers = snapshot.docs.map((memberDoc) =>
        mapUserToMember(memberDoc.data() as UserProfile)
      );
      emit();
    },
    (error: FirestoreError) => {
      console.error("Organization member subscription failed:", error);
      onError(new Error("Unable to load organization members."));
    }
  );

  const unsubscribeInvites = onSnapshot(
    invitesQuery,
    (snapshot) => {
      pendingMembers = snapshot.docs
        .map((inviteDoc) => ({ id: inviteDoc.id, ...inviteDoc.data() }) as OrganizationInvite)
        .filter((invite) => invite.status === "pending")
        .map(mapInviteToMember);
      emit();
    },
    (error: FirestoreError) => {
      console.error("Organization invite subscription failed:", error);
      onError(new Error("Unable to load organization invites."));
    }
  );

  return () => {
    unsubscribeUsers();
    unsubscribeInvites();
  };
}

export async function createTeam(orgId: string, name: string): Promise<Team> {
  const now = new Date().toISOString();
  const teamRef = doc(collection(db, TEAMS_COLLECTION));
  const team: Team = {
    id: teamRef.id,
    orgId,
    name,
    memberIds: [],
    createdAt: now,
  };

  await setDoc(teamRef, team);
  return team;
}
