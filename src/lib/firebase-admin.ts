// lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines in the private key
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

// Initialize only if not already initialized
export function getAdminApp() {
  if (admin.apps.length === 0) {
    return admin.initializeApp(firebaseAdminConfig);
  }
  return admin.apps[0];
};

export const adminDb = getFirestore(getAdminApp());
