import { doc, setDoc, getDoc, updateDoc, getDocs, collection, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';

export const createUserDocument = async (db: Firestore, user: User, additionalData?: Partial<UserProfile>): Promise<UserProfile | null> => {
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    try {
      // If the email matches the initial admin email, assign the 'admin' role.
      const defaultRole = user.email === 'info.ntchito@gmail.com' ? 'admin' : 'loan_officer';
      
      const userData: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        role: defaultRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...additionalData
      };
      
      await setDoc(userRef, userData);
      return userData;

    } catch (error) {
      throw error;
    }
  }
  
  return userSnap.data() as UserProfile;
};

export const ensureUserDocument = async (db: Firestore, user: User | null): Promise<UserProfile | null> => {
  if (!user) return null;
  
  try {
    const userDoc = await createUserDocument(db, user);
    return userDoc;
  } catch (error) {
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
        return null;
    } catch (error) {
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
