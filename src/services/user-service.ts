
'use server';

import { doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

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

export async function createUserProfile(user: {uid: string, email: string}, role: UserProfile['role'] = 'loan_officer'): Promise<UserProfile> {
    if (!adminAuth) {
      console.error("Cannot create user profile. Firebase Admin is not initialized.");
      const tempProfile: UserProfile = { uid: user.uid, email: user.email, role: 'loan_officer' };
      // Still write a temporary profile to Firestore so the app doesn't completely break.
      await setDoc(doc(db, 'users', user.uid), tempProfile, { merge: true });
      return tempProfile;
    }

    let finalRole = role;
    if (user.email === 'kazembeandrew@gmail.com') {
        finalRole = 'admin';
    }
    if (user.email === 'Jackkazembe@gmail.com') {
        finalRole = 'ceo';
    }

    const docRef = doc(db, 'users', user.uid);
    
    try {
        await adminAuth.setCustomUserClaims(user.uid, { role: finalRole });
    } catch (error) {
        console.error("Failed to set custom claims. This may happen in environments without proper admin credentials.", error);
    }
    
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: finalRole,
    };

    // Using setDoc with merge:true is equivalent to an upsert.
    await setDoc(docRef, userProfile, { merge: true });
    
    const docSnap = await getDoc(docRef);
    return docSnap.data() as UserProfile;
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    if (!adminAuth) {
      throw new Error("Cannot update user role. Firebase Admin is not initialized.");
    }
    await adminAuth.setCustomUserClaims(uid, { role });

    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role });
}


