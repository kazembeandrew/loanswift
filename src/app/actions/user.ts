'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { createUserProfile } from '@/services/user-service';

export async function handleCreateUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // We need to create the user profile in Firestore as well.
    await createUserProfile({
        uid: userRecord.uid,
        email: userRecord.email || '',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating new user:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
