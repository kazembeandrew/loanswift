'use client';

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, runTransaction, getDoc, type Firestore } from 'firebase/firestore';
import type { Account } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';


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
    // Re-throw the original error to be handled by the calling function if needed
    throw serverError;
  }
}
