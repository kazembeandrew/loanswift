'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { seedInitialUsers } from '@/lib/seed';

/**
 * Promotes a user to the 'admin' role by setting their custom claims.
 * @param email The email of the user to promote.
 * @returns A JSON response indicating success or failure.
 */
export async function promoteUserToAdmin(email: string): Promise<{
  status: 'success' | 'error';
  message: string;
  user_email: string;
  assigned_role: string | null;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  try {
    // As a one-time setup, we can trigger seeding here safely.
    // This will create the default admin/ceo users if they don't exist.
    // In a real production app, this would be a separate, one-off script.
    if (process.env.FIREBASE_API_KEY) {
        await seedInitialUsers(process.env.FIREBASE_API_KEY);
    }

    // 1. Look up the user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    // 2. Assign the custom claim
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    // 3. Update the user's document in Firestore to keep it in sync
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { role: 'admin' });
    
    console.log(`Successfully promoted ${email} to admin.`);

    return {
      status: 'success',
      message: `User ${email} has been successfully promoted to admin.`,
      user_email: email,
      assigned_role: 'admin',
      timestamp,
    };
  } catch (error: any) {
    console.error(`Failed to promote user ${email}:`, error);
    return {
      status: 'error',
      message: error.message || 'An unknown error occurred.',
      user_email: email,
      assigned_role: null,
      timestamp,
    };
  }
}
