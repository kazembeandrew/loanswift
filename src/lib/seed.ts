

'use server';

import { adminAuth } from './firebase-admin';
import fetch from 'node-fetch';

const usersToSeed = [
  {
    email: 'kazembeandrew@gmail.com',
    password: 'Password',
    role: 'admin',
  },
  {
    email: 'Jackkazembe@gmail.com',
    password: 'Naloga',
    role: 'ceo',
  },
];

async function userExists(uid: string): Promise<boolean> {
    try {
        await adminAuth.getUser(uid);
        return true;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return false;
        }
        throw error;
    }
}

// We use the REST API for user creation from the server to avoid client-side auth state conflicts
async function createUserWithRest(email: string, password: string, apiKey: string) {
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true,
            }),
        }
    );

    const data = await response.json();
    if (!response.ok) {
        // If user already exists, that's okay for our seeding purpose.
        if (data.error && data.error.message === 'EMAIL_EXISTS') {
            const user = await adminAuth.getUserByEmail(email);
            return user.uid;
        }
        throw new Error(data.error?.message || 'Failed to create user via REST API');
    }
    return data.localId;
}


export async function seedInitialUsers(apiKey: string): Promise<void> {
  console.log('Seeding initial users...');
  for (const userData of usersToSeed) {
    try {
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(userData.email);
        console.log(`User ${userData.email} already exists. Skipping creation.`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
           console.log(`User ${userData.email} not found, creating...`);
           
           // Use REST API to create user to get a UID, because admin.createUser doesn't sign the user in.
           const uid = await createUserWithRest(userData.email, userData.password, apiKey);
           userRecord = await adminAuth.getUser(uid);
           
           console.log(`Successfully created user: ${userData.email}`);
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Ensure custom claims are set
      if (userRecord && (!userRecord.customClaims || userRecord.customClaims.role !== userData.role)) {
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: userData.role });
        console.log(`Set custom claim 'role: ${userData.role}' for ${userData.email}`);
      }
      
    } catch (error) {
      console.error(`Error seeding user ${userData.email}:`, error);
    }
  }
  console.log('User seeding process finished.');
}
