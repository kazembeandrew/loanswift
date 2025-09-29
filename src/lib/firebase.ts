// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "studio-3290000872-cc6d3",
  "appId": "1:409607890089:web:fec8fb9f4369fcceec35b8",
  "apiKey": "AIzaSyC3oBGyyDowrbHQiZJxoV-_fH_49XvpqHA",
  "authDomain": "studio-3290000872-cc6d3.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "409607890089"
};

// Initialize Firebase
const apps = getApps();
const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);

let db;

// On the server, we need to use initializeFirestore with long polling enabled.
// On the client, we can use the regular getFirestore.
if (typeof window === "undefined") {
    db = initializeFirestore(app, {experimentalForceLongPolling: true});
} else {
    db = getFirestore(app);
}

export const storage = getStorage(app);
export const auth = getAuth(app);
export { db };
