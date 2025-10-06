
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "studio-3290000872-cc6d3",
  "appId": "1:409607890089:web:fec8fb9f4369fcceec35b8",
  "storageBucket": "studio-3290000872-cc6d3.appspot.com",
  "apiKey": "AIzaSyC3oBGyyDowrbHQiZJxoV-_fH_49XvpqHA",
  "authDomain": "studio-3290000872-cc6d3.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "409607890089"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db, firebaseConfig };
