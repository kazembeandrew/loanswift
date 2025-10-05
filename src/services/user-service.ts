
'use server';

import { doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

const usersCollectionRef = collection(db, 'users');

async function seedInitialUsers() {
    if (!adminAuth) return;

    const usersToSeed = [
        { email: 'kazembeandrew@gmail.com', password: 'Jackliness@2', role: 'ceo' as const },
        { email: 'info.ntchito@gmail.com', password: 'Jackliness@2', role: 'admin' as const },
        { email: 'jackkazembe@gmail.com', password: 'Naloga', role: 'cfo' as const },
    ];

    for (const userData of usersToSeed) {
        try {
            // Check if user already exists
            await adminAuth.getUserByEmail(userData.email);
            // console.log(`User ${userData.email} already exists. Skipping.`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User does not exist, create them
                console.log(`Creating user: ${userData.email}`);
                const userRecord = await adminAuth.createUser({
                    email: userData.email,
                    password: userData.password,
                    emailVerified: true,
                });
                
                const userProfile: UserProfile = {
                    uid: userRecord.uid,
                    email: userRecord.email || '',
                    role: userData.role,
                };
                
                await adminAuth.setCustomUserClaims(userRecord.uid, { role: userData.role });
                await setDoc(doc(db, 'users', userRecord.uid), userProfile);
                console.log(`Successfully created and configured user: ${userData.email} with role ${userData.role}`);
            } else {
                // Another error occurred
                console.error(`Error checking user ${userData.email}:`, error);
            }
        }
    }
}

// Call the seeding function. This will run on server startup.
// In a real production scenario, this might be a separate, one-time script.
seedInitialUsers().catch(console.error);


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
    
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        // If the document exists, return the existing profile.
        // This prevents overwriting roles set by an admin.
        return docSnap.data() as UserProfile;
    }

    if (!adminAuth) {
      console.error("Cannot create user profile. Firebase Admin is not initialized.");
      const tempProfile: UserProfile = { uid: user.uid, email: user.email, role: 'loan_officer' };
      // Still write a temporary profile to Firestore so the app doesn't completely break.
      await setDoc(doc(db, 'users', user.uid), tempProfile, { merge: true });
      return tempProfile;
    }
    
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: role,
    };

    try {
        await adminAuth.setCustomUserClaims(user.uid, { role: userProfile.role });
    } catch (error) {
        console.error("Failed to set custom claims. This may happen in environments without proper admin credentials.", error);
    }

    // Using setDoc with merge:true is equivalent to an upsert.
    await setDoc(docRef, userProfile, { merge: true });
    
    const finalDocSnap = await getDoc(docRef);
    return finalDocSnap.data() as UserProfile;
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    if (!adminAuth) {
      throw new Error("Cannot update user role. Firebase Admin is not initialized.");
    }
    await adminAuth.setCustomUserClaims(uid, { role });

    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role });
}
