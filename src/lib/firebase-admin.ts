// lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines in the private key
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

// Initialize only if not already initialized
export const getAdminApp = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseAdminConfig);
  }
  return getApps()[0];
};

export const adminDb = getFirestore(getAdminApp());
