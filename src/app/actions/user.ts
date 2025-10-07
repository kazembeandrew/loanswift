'use server';

import { addAuditLog } from '@/services/audit-log-service';
import type { UserProfile } from '@/types';
import { doc, updateDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized, but only once.
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.clientEmail && serviceAccount.privateKey && serviceAccount.projectId) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

export async function handleCreateUser(email: string, password: string, role: UserProfile['role']): Promise<{ success: boolean; error?: string }> {
  const adminApp = initializeAdminApp();
  if (!adminApp) {
    return { success: false, error: 'Firebase Admin not configured on the server.' };
  }
  const adminAuth = admin.auth(adminApp);
  const db = getFirestore(getFirebase());
  
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // This creates the document in Firestore
    const userRef = doc(db, 'users', userRecord.uid);
    const userData: UserProfile = {
      uid: userRecord.uid,
      email: userRecord.email || '',
      role: role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, userData);

    // This sets the custom claim, which is critical for security rules and backend access control
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    
    await addAuditLog({
        userEmail: 'system@admin', // Should be replaced with actual admin user email from session
        action: 'USER_CREATE',
        details: {
            newUserEmail: email,
            assignedRole: role
        }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}

export async function handleUpdateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    const adminApp = initializeAdminApp();
    if (!adminApp) {
      throw new Error("Cannot update user role. Firebase Admin is not initialized.");
    }
    const adminAuth = admin.auth(adminApp);
    const db = getFirestore(getFirebase());
    
    // Get user email for logging before updating
    const userToUpdate = await adminAuth.getUser(uid);

    // Set the custom claim first
    await adminAuth.setCustomUserClaims(uid, { role });
    
    // Then update the user's document in Firestore
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role, updatedAt: new Date().toISOString() });

    await addAuditLog({
        userEmail: 'system@admin', // Should be replaced with actual admin user email from session
        action: 'USER_ROLE_UPDATE',
        details: {
            updatedUserEmail: userToUpdate.email,
            newRole: role
        }
    });
}
