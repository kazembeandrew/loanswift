
'use server';

import { doc, setDoc, getDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { adminAuth } from '@/lib/firebase-admin';


export const createUserDocument = async (user: User, additionalData?: any): Promise<UserProfile | null> => {
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    try {
      // Default role for new sign-ups.
      const defaultRole = 'loan_officer';
      
      const userData: Omit<UserProfile, 'uid'> & {uid: string} = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        role: defaultRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...additionalData
      };
      
      if (adminAuth) {
        await adminAuth.setCustomUserClaims(user.uid, { role: defaultRole });
      }

      await setDoc(userRef, userData);
      console.log('New user document created for:', user.email);
      
      const { uid, ...profileData } = userData;
      return { uid, ...profileData } as UserProfile;

    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  }
  
  const profile = userSnap.data() as UserProfile;

  // Sync claims if they are missing or different
  if (adminAuth) {
      try {
        const authUser = await adminAuth.getUser(user.uid);
        if (authUser.customClaims?.role !== profile.role) {
            await adminAuth.setCustomUserClaims(user.uid, { role: profile.role });
        }
      } catch (e) {
          console.error("Error syncing custom claims", e);
      }
  }


  return profile;
};

export const ensureUserDocument = async (user: User | null): Promise<UserProfile | null> => {
  if (!user) return null;
  
  try {
    const userDoc = await createUserDocument(user);
    return userDoc;
  } catch (error) {
    console.error('Error ensuring user document:', error);
    return null;
  }
};


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}


export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    if (!adminAuth) {
      throw new Error("Cannot update user role. Firebase Admin is not initialized.");
    }
    // Set the custom claim first. This is the source of truth.
    await adminAuth.setCustomUserClaims(uid, { role });

    // Then, update the Firestore document for client-side access and querying.
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role, updatedAt: new Date().toISOString() });
}

export async function handleCreateUser(email: string, password: string, role: UserProfile['role']): Promise<{ success: boolean; error?: string }> {
  if (!adminAuth) {
    return { success: false, error: 'Firebase Admin not configured on the server.' };
  }
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    await ensureUserDocument(userRecord as unknown as User, { role });
    await updateUserRole(userRecord.uid, role);

    return { success: true };
  } catch (error: any) {
    console.error('Error creating new user:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}

export async function promoteUserToAdmin(email: string): Promise<{
  status: 'success' | 'error';
  message: string;
}> {
  if (!adminAuth) {
    return {
      status: 'error',
      message: 'Firebase Admin not configured on the server.',
    };
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    await updateUserRole(uid, 'admin');
    
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
