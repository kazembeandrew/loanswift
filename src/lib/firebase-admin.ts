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

let adminApp: admin.app.App;
let adminDbInstance: admin.firestore.Firestore;

function initializeAdminApp() {
    if (admin.apps.length > 0) {
        adminApp = admin.apps[0]!;
        adminDbInstance = getFirestore(adminApp);
        return;
    }

    // Ensure all credentials are provided before initializing
    if (
        firebaseAdminConfig.credential.projectId &&
        (firebaseAdminConfig.credential as admin.ServiceAccount).clientEmail &&
        (firebaseAdminConfig.credential as admin.ServiceAccount).privateKey
    ) {
        adminApp = admin.initializeApp(firebaseAdminConfig);
        adminDbInstance = getFirestore(adminApp);
    } else {
        console.warn("Firebase Admin credentials are not fully provided. Admin SDK not initialized.");
    }
}

initializeAdminApp();

export function getAdminApp() {
  return adminApp;
};

export { adminDbInstance as adminDb };
