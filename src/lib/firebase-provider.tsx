'use client';

import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Types
export interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// Context
const FirebaseContext = React.createContext<FirebaseContextValue | undefined>(
  undefined
);

// Provider
export function FirebaseProvider({
  value,
  children,
}: {
  value: FirebaseContextValue;
  children: React.ReactNode;
}) {
  return (
    <FirebaseContext.Provider value={value}>
      {children}
      {process.env.NODE_ENV === 'development' && <FirebaseErrorListener />}
    </FirebaseContext.Provider>
  );
}

// Hooks
function useFirebase() {
  const context = React.useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseAuth() {
  return useFirebase()?.auth;
}

export function useDB() {
  return useFirebase()?.db;
}
