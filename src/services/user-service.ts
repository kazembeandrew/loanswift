import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { User } from 'firebase/auth';

const usersCollectionRef = collection(db, 'users');

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const snapshot = await getDocs(usersCollectionRef);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function createUserProfile(user: User): Promise<UserProfile> {
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: 'staff', // Default role for new users
    };
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, userProfile);
    return userProfile;
}
