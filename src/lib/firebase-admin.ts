
import admin from 'firebase-admin';

// This file now ONLY exports the admin instance.
// Initialization is handled by the server actions that need it.
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.clientEmail && serviceAccount.privateKey && serviceAccount.projectId) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } else {
        console.log('Firebase Admin SDK not initialized because environment variables are missing.');
    }

  } catch (error) {
    console.error('CRITICAL: Firebase admin initialization failed.', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
