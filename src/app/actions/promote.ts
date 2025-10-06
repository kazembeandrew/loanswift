'use server';

import { initializeAdminApp } from '@/lib/firebase-admin';
import { getFirebase } from '@/lib/firebase';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import admin from 'firebase-admin';

/**
 * Promotes a user to the 'admin' role by setting their custom claims.
 * @param email The email of the user to promote.
 * @returns A JSON response indicating success or failure.
 */
export async function promoteUserToAdmin(email: string): Promise<{
  status: 'success' | 'error';
  message: string;
}> {
  const adminApp = initializeAdminApp();
  if (!adminApp) {
    return {
      status: 'error',
      message: 'Firebase Admin not configured on the server.',
    };
  }
  const adminAuth = admin.auth(adminApp);
  const db = getFirestore(getFirebase());

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { role: 'admin' });
    
    return {
      status: 'success',
      message: `User ${email} has been successfully promoted to admin.`,
    };
  } catch (error: any) {
    console.error(`Failed to promote user ${email}:`, error);
    return {
      status: 'error',
      message: error.message || 'An unknown error occurred.',
    };
  }
}
