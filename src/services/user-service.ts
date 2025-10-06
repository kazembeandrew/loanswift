
'use server';

import { doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

const usersCollectionRef = collection(db, 'users');

async function seedInitialUsers() {
    if (!adminAuth) {
        console.warn("Skipping user seeding: Firebase Admin not available.");
        return;
    };

    // Check if the admin user already exists to determine if seeding is needed.
    try {
        await adminAuth.getUserByEmail('info.ntchito@gmail.com');
        // If user exists, assume seeding has been done and exit.
        return;
    } catch (error: any) {
        // If user does not exist, proceed with seeding.
        if (error.code !== 'auth/user-not-found') {
            console.error("Error checking for initial admin user, aborting seed:", error);
            return;
        }
    }


    const usersToSeed = [
        { email: 'kazembeandrew@gmail.com', password: 'Jackliness@2', role: 'ceo' as const },
        { email: 'info.ntchito@gmail.com', password: 'Jackliness@2', role: 'admin' as const },
        { email: 'jackkazembe@gmail.com', password: 'Naloga', role: 'cfo' as const },
    ];

    for (const userData of usersToSeed) {
        try {
            // Re-check each user individually before creation
            await adminAuth.getUserByEmail(userData.email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
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
            } else {
                console.error(`Error checking user ${userData.email}:`, error);
            }
        }
    }
}

// Call the seeding function. This will run on server startup.
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
        const existingProfile = docSnap.data() as UserProfile;
        // If the role in the token (from claims) is different from Firestore, update Firestore.
        if (adminAuth && existingProfile.role !== role) {
            await updateDoc(docRef, { role: role });
            return { ...existingProfile, role: role };
        }
        return existingProfile;
    }

    // If the profile doesn't exist, create it.
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: role,
    };

    if (adminAuth) {
        try {
            await adminAuth.setCustomUserClaims(user.uid, { role: userProfile.role });
        } catch (error) {
            console.error("Failed to set custom claims. This may happen in environments without proper admin credentials.", error);
        }
    }
    
    await setDoc(docRef, userProfile, { merge: true });
    return userProfile;
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    if (!adminAuth) {
      throw new Error("Cannot update user role. Firebase Admin is not initialized.");
    }
    await adminAuth.setCustomUserClaims(uid, { role });

    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role });
}
