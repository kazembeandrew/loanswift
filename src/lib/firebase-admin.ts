
import admin from 'firebase-admin';
import { firebaseConfig } from './firebase';

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: firebaseConfig.projectId,
      clientEmail: `firebase-adminsdk-1y90q@${firebaseConfig.projectId}.iam.gserviceaccount.com`, // Standard service account email format
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set. Please check your .env file.');
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
