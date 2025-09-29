import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { User } from 'firebase/auth';

const usersCollection = 'users';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, usersCollection, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
}

export async function createUserProfile(user: User): Promise<UserProfile> {
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: 'staff', // Default role for new users
    };
    const docRef = doc(db, usersCollection, user.uid);
    await setDoc(docRef, userProfile);
    return userProfile;
}
