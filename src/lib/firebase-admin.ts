import { readFileSync, existsSync } from "fs";
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let serviceAccountCache: ServiceAccount | null | undefined = undefined;

function parseServiceAccount(): ServiceAccount | null | undefined {
  if (serviceAccountCache !== undefined) return serviceAccountCache;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (raw && raw.trim().length > 0) {
    try {
      serviceAccountCache = JSON.parse(raw) as ServiceAccount;
      return serviceAccountCache;
    } catch {
      try {
        serviceAccountCache = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
        return serviceAccountCache;
      } catch {
        console.error("[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON (not JSON or base64-JSON)");
      }
    }
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath && existsSync(filePath)) {
    try {
      serviceAccountCache = JSON.parse(readFileSync(filePath, "utf8")) as ServiceAccount;
      return serviceAccountCache;
    } catch {
      console.error("[firebase-admin] Invalid service account file at", filePath);
    }
  }

  serviceAccountCache = null;
  return serviceAccountCache;
}

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existing = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const serviceAccount = parseServiceAccount();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount?.projectId ||
    "whatsapp-taskflow";

  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId || projectId,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  } else {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  return adminApp;
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  adminDb = getFirestore(getAdminApp());
  adminDb.settings({ ignoreUndefinedProperties: true });
  return adminDb;
}

export function isAdminConfigured(): boolean {
  return Boolean(parseServiceAccount());
}