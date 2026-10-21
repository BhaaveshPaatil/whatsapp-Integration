import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const requiredFirebaseEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

function validateFirebaseEnv(): void {
  const missingFirebaseEnv = requiredFirebaseEnv.filter(
    (key) => !process.env[key]
  );

  if (missingFirebaseEnv.length > 0) {
    console.warn(
      `Missing Firebase environment variables: ${missingFirebaseEnv.join(
        ", "
      )}. Copy .env.example to .env and fill in your Firebase project values.`
    );
  }
}

validateFirebaseEnv();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch {
  // Firebase not configured during build — will fail at runtime if used
}

// Services are initialized lazily; wrap in try-catch so build succeeds
// even when Firebase config is incomplete (empty API key etc.)
let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: ReturnType<typeof getFirestore> | null = null;
let storageInstance: ReturnType<typeof getStorage> | null = null;

if (app) {
  try {
    authInstance = getAuth(app);
  } catch {
    // Auth init failed — config likely invalid
  }
  try {
    dbInstance = getFirestore(app);
  } catch {
    // Firestore init failed
  }
  try {
    storageInstance = getStorage(app);
  } catch {
    // Storage init failed
  }
}

export function getFirebaseAuth() {
  return authInstance;
}

export function getFirebaseDb() {
  return dbInstance;
}

export function getFirebaseStorage() {
  return storageInstance;
}

export const auth = authInstance!;
export const db = dbInstance!;
export const storage = storageInstance!;

// Analytics runs only in client-side browser environment
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported && app) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics is optional
      }
    }
  });
}

export { analytics };
export default app;
