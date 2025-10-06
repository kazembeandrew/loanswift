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

async function checkAdminUser() {
  console.log('\n--- Running Diagnostic Check ---');
  console.log(`Checking for user: ${ADMIN_EMAIL}`);
  try {
    // 1. Check Firebase Auth
    const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log('\n[SUCCESS] User found in Firebase Authentication.');
    console.log('  UID:', userRecord.uid);
    console.log('  Email:', userRecord.email);
    console.log('  Custom Claims:', userRecord.customClaims);

    if (userRecord.customClaims?.role !== 'admin') {
      console.error('\n[PROBLEM] User does NOT have "admin" custom claim!');
    } else {
      console.log('\n[SUCCESS] User has "admin" custom claim.');
    }

    // 2. Check Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error('\n[PROBLEM] User document not found in Firestore!');
    } else {
      console.log('\n[SUCCESS] User document found in Firestore.');
      console.log('  Document Path:', userDocRef.path);
      console.log('  Document Data:', userDoc.data());
       if (userDoc.data()?.role !== 'admin') {
         console.error('\n[PROBLEM] Firestore document role is NOT "admin"!');
       } else {
         console.log('\n[SUCCESS] Firestore document role is "admin".');
       }
    }

  } catch (error) {
     if (error.code === 'auth/user-not-found') {
        console.error('\n[PROBLEM] User does not exist in Firebase Authentication.');
     } else {
        console.error('\n❌ An unexpected error occurred during diagnostic check:', error);
     }
  } finally {
    console.log('\n--- Diagnostic Check Complete ---');
  }
}


// Decide which function to run based on command line arguments
const command = process.argv[2];

if (command === 'check') {
    checkAdminUser();
} else {
    seedAdminUser();
}
