
import admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized, but only once.
export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.clientEmail && serviceAccount.privateKey && serviceAccount.projectId) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn('Firebase Admin credentials are not fully set in environment variables. Admin features may not work.');
      return null;
    }
  } catch (error) {
    console.error('CRITICAL: Firebase admin initialization failed.', error);
    return null;
  }
}
