
import admin from 'firebase-admin';
import { firebaseConfig } from './firebase';

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: firebaseConfig.projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variable is not set. Please check your .env file.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (error) {
    console.error('CRITICAL: Firebase admin initialization failed.', error);
    // In a production environment, this should be handled more gracefully.
    // For this development context, we will throw to make the problem obvious.
    throw new Error('Firebase admin initialization failed. Check server logs for details.');
  }
}

export const adminAuth = admin.auth();
