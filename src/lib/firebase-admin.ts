import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

if (!admin.apps.length) {
  try {
    const serviceAccountCredentials = serviceAccount as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountCredentials),
    });
    
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const adminAuth = admin.auth();
