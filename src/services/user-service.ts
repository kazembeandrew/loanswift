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
      console.log(`✅ User document found for: ${user.uid}`);
      return userSnap.data() as UserProfile;
    } else {
      // Create the user document if it doesn't exist
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        role: 'loan_officer', // Default role for new users
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, userProfile);
      console.log(`✅ Created user document for: ${user.uid} with role: ${userProfile.role}`);
      return userProfile;
    }
  } catch (serverError: any) {
     if (serverError.code === 'permission-denied') {
      // This is a special case. If we can't even get or create the user's own doc, it's a fundamental rules issue.
      const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'write', // Assume write since create is the more likely failure point
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error(`❌ Failed to ensure user document for ${user.uid}:`, serverError);
    return null;
  }
};

export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
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
      return snapshot.docs.map(doc => doc.data() as UserProfile);
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
