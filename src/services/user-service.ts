import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  getDocs, 
  collection, 
  type Firestore 
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


export const ensureUserDocument = async (db: Firestore, user: User): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // If the document exists, return its data.
      return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    } else {
      // Create the user document if it doesn't exist
      const userProfileData: Omit<UserProfile, 'id'> = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        role: 'loan_officer', // Default role for new users
        status: 'pending', // NEW: User needs approval
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, userProfileData);
      return { id: user.uid, ...userProfileData };
    }
  } catch (serverError: any) {
     if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'write',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error(`Failed to ensure user document for ${user.uid}:`, serverError);
    return null;
  }
};

export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as UserProfile;
        }
        return null;
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function getAllUsers(db: Firestore): Promise<UserProfile[]> {
    const usersCollection = collection(db, 'users');
    try {
      const snapshot = await getDocs(usersCollection);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: usersCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
