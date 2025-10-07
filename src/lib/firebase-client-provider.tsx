'use client';

import { createContext, useContext, ReactNode } from 'react';
import { app } from './firebase';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

const FirebaseContext = createContext<{
  db: Firestore;
  auth: Auth;
} | undefined>(undefined);

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseContext.Provider value={{ db, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useDB() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useDB must be used within a FirebaseClientProvider');
  }
  return context.db;
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseClientProvider');
  }
  return context.auth;
}
