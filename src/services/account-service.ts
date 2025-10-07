'use client';

import { collection, getDocs, type Firestore } from 'firebase/firestore';
import type { Account } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


export async function getAccounts(db: Firestore): Promise<Account[]> {
  const accountsCollection = collection(db, 'accounts');
  try {
    const snapshot = await getDocs(accountsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
          path: accountsCollection.path,
          operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    // Re-throw so the calling component knows the fetch failed.
    throw serverError;
  }
}
