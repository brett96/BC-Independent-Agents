import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let db;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFirebaseAdminConfigured() {
  return parseServiceAccount() !== null;
}

export function getAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  }
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const serviceAccount = parseServiceAccount();
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }
  }
  return app;
}

export function getAdminDb() {
  if (!db) {
    db = getFirestore(getAdminApp());
  }
  return db;
}

export function isFirestoreNotFoundError(err) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 5
  );
}

export const FIRESTORE_SETUP_HINT =
  'Firestore database not found. In Firebase Console, go to Build → Firestore Database → Create database.';
