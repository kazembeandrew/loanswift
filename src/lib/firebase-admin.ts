import admin from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? JSON.parse(
          Buffer.from(
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
            'base64'
          ).toString('ascii')
        )
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS is not a base64 string
      // or for local development using application default credentials.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const adminAuth = admin.auth();
