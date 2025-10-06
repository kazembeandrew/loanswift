// This script is used to seed the initial admin user for the application.
// It should be run from the terminal using `npm run seed:admin`

require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

// --- Configuration ---
// The user to be created. Change these values to your desired admin credentials.
const ADMIN_EMAIL = 'info.ntchito@gmail.com';
const ADMIN_PASSWORD = 'Jackliness@2';
// --- End Configuration ---

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Error: Missing Firebase Admin credentials in your .env file.');
  console.error('Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function seedAdminUser() {
  console.log(`Attempting to create or update admin user: ${ADMIN_EMAIL}`);

  try {
    let userRecord;

    // 1. Check if the user already exists
    try {
      userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log('User already exists. Updating claims and Firestore document...');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('User not found. Creating new user...');
        // 2. If user doesn't exist, create them
        userRecord = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          emailVerified: true, // It's good practice to verify the admin email
        });
        console.log('Successfully created new user:', userRecord.uid);
      } else {
        // Another error occurred
        throw error;
      }
    }

    const { uid, email } = userRecord;

    // 3. Set the 'admin' custom claim
    await auth.setCustomUserClaims(uid, { role: 'admin' });
    console.log(`Successfully set 'admin' custom claim for ${email}.`);

    // 4. Create or update the user's document in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDocData = {
        uid,
        email,
        role: 'admin',
        createdAt: userRecord.metadata.creationTime,
        updatedAt: new Date().toISOString(),
    };
    
    await userRef.set(userDocData, { merge: true });
    console.log(`Successfully created/updated Firestore document for user ${uid}.`);

    console.log('\n✅ Admin user seeding complete!');
    console.log('You can now log in with the specified credentials.');

  } catch (error) {
    console.error('❌ Error during admin user seeding:', error);
    process.exit(1);
  }
}

seedAdminUser();
