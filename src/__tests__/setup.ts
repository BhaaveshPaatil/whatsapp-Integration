import "@testing-library/jest-dom";

// Set required env vars before any module loads
process.env.ENCRYPTION_KEY = "test-encryption-key-32-bytes-long-for-testing";
process.env.PIPELINE_WORKER_SECRET = "test-worker-secret";
process.env.GEMINI_API_KEY = "";
process.env.WHATSAPP_ACCESS_TOKEN = "";
process.env.WHATSAPP_APP_SECRET = "";
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";
process.env.DEFAULT_ORG_ID = "";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abc";
process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-TEST";
