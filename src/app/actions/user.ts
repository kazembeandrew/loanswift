'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { createUserProfile } from '@/services/user-service';
import type { UserProfile } from '@/types';

export async function handleCreateUser(email: string, password: string, role: UserProfile['role']): Promise<{ success: boolean; error?: string }> {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // We need to create the user profile in Firestore and set custom claims
    await createUserProfile({
        uid: userRecord.uid,
        email: userRecord.email || '',
    }, role);

    return { success: true };
  } catch (error: any) {
    console.error('Error creating new user:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
