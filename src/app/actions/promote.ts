
'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

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
  {
    email: 'loanofficer@example.com',
    password: 'password',
    role: 'loan_officer',
  }
];

async function seedInitialUsers(): Promise<void> {
  if (!adminAuth) {
    console.error("Skipping user seeding: Firebase Admin not initialized.");
    return;
  }
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
           
           userRecord = await adminAuth.createUser({
               email: userData.email,
               password: userData.password,
           });
           
           console.log(`Successfully created user: ${userData.email}`);
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Ensure custom claims are set
      if (userRecord && (!userRecord.customClaims || userRecord.customClaims.role !== userData.role)) {
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: userData.role });
        const userDocRef = doc(db, 'users', userRecord.uid);
        await setDoc(userDocRef, { role: userData.role }, { merge: true });
        console.log(`Set custom claim 'role: ${userData.role}' for ${userData.email}`);
      }
      
    } catch (error) {
      console.error(`Error seeding user ${userData.email}:`, error);
    }
  }
  console.log('User seeding process finished.');
}


/**
 * Promotes a user to the 'admin' role by setting their custom claims.
 * @param email The email of the user to promote.
 * @returns A JSON response indicating success or failure.
 */
export async function promoteUserToAdmin(email: string): Promise<{
  status: 'success' | 'error';
  message: string;
  user_email: string;
  assigned_role: string | null;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  if (!adminAuth) {
    return {
      status: 'error',
      message: 'Firebase Admin not configured on the server.',
      user_email: email,
      assigned_role: null,
      timestamp,
    };
  }

  try {
    await seedInitialUsers();

    const userRecord = await adminAuth.getUserByEmail(email);
    const uid = userRecord.uid;

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { role: 'admin' });
    
    console.log(`Successfully promoted ${email} to admin.`);

    return {
      status: 'success',
      message: `User ${email} has been successfully promoted to admin.`,
      user_email: email,
      assigned_role: 'admin',
      timestamp,
    };
  } catch (error: any) {
    console.error(`Failed to promote user ${email}:`, error);
    return {
      status: 'error',
      message: error.message || 'An unknown error occurred.',
      user_email: email,
      assigned_role: null,
      timestamp,
    };
  }
}
