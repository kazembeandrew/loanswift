
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  serverTimestamp,
  type Firestore 
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


// Enhanced ensureUserDocument with retry logic and admin auto-approval
export const ensureUserDocument = async (db: Firestore, user: User, retryCount = 0): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', user.uid);
  
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      console.log(`✅ User document found for: ${user.uid}`);
      const profile = userSnap.data() as UserProfile;
      profile.uid = userSnap.id;
      return profile;
    } else {
      // Wait a bit for auth to fully propagate, especially on first attempt
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Auto-approve the initial admin user from .env
      const isAdminEmail = user.email === 'info.ntchito@gmail.com';
      const initialStatus = isAdminEmail ? 'approved' : 'pending';

      const newUserDoc: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        role: isAdminEmail ? 'admin' : 'loan_officer',
        status: initialStatus,
      };

      console.log(`🔄 Creating user document for: ${user.uid} with status: ${initialStatus} (attempt ${retryCount + 1})`);
      await setDoc(userRef, {
          ...newUserDoc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      });
      
      // CRITICAL: Fetch the document back to get server-generated timestamps
      const newUserSnap = await getDoc(userRef);
      if (newUserSnap.exists()) {
          console.log(`✅ Created and fetched user document for: ${user.uid}`);
          const profile = newUserSnap.data() as UserProfile;
          profile.uid = newUserSnap.id;
          return profile;
      } else {
          // This should be a very rare case
          throw new Error("Failed to retrieve user document immediately after creation.");
      }
    }
  } catch (error: any) {
    console.error(`❌ Error in ensureUserDocument (attempt ${retryCount + 1}):`, error);
    
    // Retry logic for permission errors (common during auth propagation)
    if (error.code === 'permission-denied' && retryCount < 3) {
      console.log(`🔄 Retrying user document creation in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return ensureUserDocument(db, user, retryCount + 1);
    }
    
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    
    // Re-throw other errors
    throw error;
  }
};

export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
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
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
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
