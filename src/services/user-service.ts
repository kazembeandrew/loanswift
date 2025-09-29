'use server';

import { doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
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

export async function createUserProfile(user: {uid: string, email: string}, role: UserProfile['role'] = 'loan_officer'): Promise<UserProfile> {
    
    let finalRole = role;
    if (user.email === 'kazembeandrew@gmail.com') {
        finalRole = 'admin';
    }

    const docRef = doc(db, 'users', user.uid);
    
    // This is the source of truth for the role, coming from Firebase Auth claims.
    // This must be set by a secure server-side process (see actions/user.ts)
    await adminAuth.setCustomUserClaims(user.uid, { role: finalRole });
    
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: finalRole,
    };

    // Create or update the user profile in Firestore to match the auth claims.
    await setDoc(docRef, userProfile, { merge: true });
    
    return userProfile;
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    // Update the custom claim in Firebase Auth first
    await adminAuth.setCustomUserClaims(uid, { role });

    // Then, update the role in the Firestore document
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role });
}
