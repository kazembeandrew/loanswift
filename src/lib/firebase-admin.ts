
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminAuth: admin.auth.Auth;

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error("serviceAccountKey.json not found in the project root. Please download it from your Firebase project settings and place it in the root directory.");
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('CRITICAL: Firebase admin initialization failed.', error);
    // In a production environment, you might want to handle this more gracefully.
    // For this development context, we will throw to make the problem obvious.
    throw new Error('Firebase admin initialization failed. Check server logs for details.');
  }
}

adminAuth = admin.auth();

export { adminAuth };
