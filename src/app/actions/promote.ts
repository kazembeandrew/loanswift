'use server';

import { initializeAdminApp } from '@/lib/firebase-admin';
import { getFirebase } from '@/lib/firebase';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { addAuditLog } from '@/services/audit-log-service';
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
  
  // Need to get the current user who is performing the action
  // This is a placeholder as we don't have server-side auth session easily here
  // In a real app, you'd get this from the session.
  const promoterEmail = 'system@admin';

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { role: 'admin' });

    await addAuditLog(db, {
        userEmail: promoterEmail,
        action: 'USER_PROMOTE',
        details: {
            promotedUserEmail: email,
            newRole: 'admin'
        }
    });
    
    return {
      status: 'success',
      message: `User ${email} has been successfully promoted to admin.`,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'An unknown error occurred.',
    };
  }
}
