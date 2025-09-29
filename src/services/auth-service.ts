// This file would handle Firebase authentication logic.
// For now, we are using a mock implementation.

import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';


export const signInWithEmail = (email: string, password: string): Promise<User> => {
    return signInWithEmailAndPassword(auth, email, password).then(userCredential => {
        return userCredential.user;
    });
}

export const signOutUser = (): Promise<void> => {
    return signOut(auth);
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    return onFirebaseAuthStateChanged(auth, callback);
}
