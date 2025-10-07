import { doc, setDoc, getDoc, updateDoc, getDocs, collection, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';


export const ensureUserDocument = async (db: Firestore, user: User): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // If the document exists, return its data.
    return userSnap.data() as UserProfile;
  } else {
    // This case should ideally be handled by the backend user creation process (e.g., cloud function or seed script)
    // where the document is created along with the user.
    // For robustness, we check here, but if it's missing for a logged-in user, it indicates an inconsistent state.
    console.error(`User document not found for uid: ${user.uid}. The user might not have a role assigned.`);
    return null;
  }
};


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

// This function now only updates the Firestore document. The custom claim is set in a server action.
export async function updateUserRoleInFirestore(db: Firestore, uid: string, role: UserProfile['role']): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role, updatedAt: new Date().toISOString() });
}
