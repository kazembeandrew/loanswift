'use client';

import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, type Firestore, limit, orderBy } from 'firebase/firestore';
import type { Borrower } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


export async function addBorrower(db: Firestore, borrowerData: Omit<Borrower, 'id' | 'joinDate'>): Promise<Borrower> {
  const borrowersCollection = collection(db, 'borrowers');
  const fullBorrowerData = {
    ...borrowerData,
    joinDate: new Date().toISOString(),
  };
  try {
    const docRef = await addDoc(borrowersCollection, fullBorrowerData);
    return {
        id: docRef.id,
        ...fullBorrowerData,
      };
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: borrowersCollection.path,
            operation: 'create',
            requestResourceData: fullBorrowerData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function updateBorrower(db: Firestore, id: string, updates: Partial<Omit<Borrower, 'id' | 'joinDate'>>): Promise<void> {
    const docRef = doc(db, 'borrowers', id);
    try {
      await updateDoc(docRef, updates);
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updates,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
