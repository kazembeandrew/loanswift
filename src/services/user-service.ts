import { doc, setDoc, getDoc, updateDoc, getDocs, collection, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';


export const ensureUserDocument = async (db: Firestore, user: User | null): Promise<UserProfile | null> => {
  if (!user) return null;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  
  // If the document doesn't exist, it should have been created on the backend
  // during sign-up. We return null and let the auth context handle it,
  // which might involve logging the user out or showing an error.
  return null;
};


export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
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

// This function now only updates the Firestore document. The custom claim is set in a server action.
export async function updateUserRoleInFirestore(db: Firestore, uid: string, role: UserProfile['role']): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role, updatedAt: new Date().toISOString() });
}
