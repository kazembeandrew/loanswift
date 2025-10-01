
import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        throw new Error('Firebase credentials are not set in the environment variables. Please check your .env file.');
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

adminAuth = admin.auth();

export { adminAuth };
