
'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

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
  if (!adminAuth) {
    return {
      status: 'error',
      message: 'Firebase Admin not configured on the server.',
      user_email: email,
      assigned_role: null,
      timestamp,
    };
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

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
