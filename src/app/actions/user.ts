'use server';

import { initializeAdminApp } from '@/lib/firebase-admin';
import { createUserDocument } from '@/services/user-service';
import type { UserProfile } from '@/types';
import { User } from 'firebase/auth';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

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

    await createUserDocument(db, userRecord as unknown as User, { role });
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating new user:', error);
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

    // Set the custom claim first
    await adminAuth.setCustomUserClaims(uid, { role });
    
    // Then update the user's document in Firestore
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role, updatedAt: new Date().toISOString() });
}
