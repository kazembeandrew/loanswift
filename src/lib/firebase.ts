
import { getApps, initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig } from "./firebase/config";

// This prevents re-initialization in Next.js hot-reload environments.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

function getFirebase() {
    return { app, auth, db };
}

export { app, auth, db, getFirebase };
