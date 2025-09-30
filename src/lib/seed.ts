
'use server';

import { adminAuth } from './firebase-admin';

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

export async function seedInitialUsers(): Promise<void> {
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
        console.log(`Set custom claim 'role: ${userData.role}' for ${userData.email}`);
      }
      
    } catch (error) {
      console.error(`Error seeding user ${userData.email}:`, error);
    }
  }
  console.log('User seeding process finished.');
}
