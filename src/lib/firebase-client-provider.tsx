'use client';

import * as React from 'react';
import { app, auth, db } from './firebase';
import { FirebaseProvider, type FirebaseContextValue } from './firebase-provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const value = React.useMemo<FirebaseContextValue>(() => ({ app, auth, db }), []);

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
