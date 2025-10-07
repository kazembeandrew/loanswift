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

export const ensureUserDocument = async (db: Firestore, user: User): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // If the document exists, return its data.
    console.log(`✅ User document found for: ${user.uid}`);
    return userSnap.data() as UserProfile;
  } else {
    // ✅ FIX: Create the user document if it doesn't exist
    try {
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
    } catch (error) {
      console.error(`❌ Failed to create user document for ${user.uid}:`, error);
      return null;
    }
  }
};

// The rest of your existing functions can stay the same
export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
        console.warn(`User profile document does not exist for uid: ${uid}`);
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}

export async function getAllUsers(db: Firestore): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function updateUserRoleInFirestore(db: Firestore, uid: string, role: UserProfile['role']): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { 
      role, 
      updatedAt: new Date().toISOString() 
    });
}
