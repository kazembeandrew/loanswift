import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Use Application Default Credentials. This is the recommended way for server environments.
    // It automatically finds credentials in well-known locations,
    // such as the GOOGLE_APPLICATION_CREDENTIALS environment variable.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    // In a production environment, you might want to handle this more gracefully.
    // For now, we log the error to the console.
  }
}

export const adminAuth = admin.auth();
