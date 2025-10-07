'use client';

import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This file is now deprecated and its functionality has been merged into 
// `firebase-client-provider.tsx` and `auth-context.tsx`.
// It is kept here to prevent breaking imports in files that have not yet been updated.
// New code should use `useDB()` and `useFirebaseAuth()` from `firebase-client-provider.tsx`.

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
