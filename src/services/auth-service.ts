// This file would handle Firebase authentication logic.
// For now, we are using a mock implementation.

import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';


export const signInWithEmail = (email: string, password: string): Promise<User> => {
    return signInWithEmailAndPassword(auth, email, password).then(userCredential => {
        return userCredential.user;
    });
}

export const signInWithGoogle = (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider).then(userCredential => {
        return userCredential.user;
    });
};

export const signOutUser = (): Promise<void> => {
    return signOut(auth);
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onFirebaseAuthStateChanged(auth, callback);
}
