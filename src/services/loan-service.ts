'use client';

import { collection, getDocs, query, where, doc, getDoc, updateDoc, type Firestore, orderBy, limit } from 'firebase/firestore';
import type { Loan } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


export async function getLoans(db: Firestore): Promise<Loan[]> {
  const loansCollection = collection(db, 'loans');
  const q = query(loansCollection, orderBy('startDate', 'desc'), limit(100));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: loansCollection.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function getLoanById(db: Firestore, id: string): Promise<Loan | null> {
    const docRef = doc(db, 'loans', id);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Loan;
        }
        return null;
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function getLoansByBorrowerId(db: Firestore, borrowerId: string): Promise<Loan[]> {
    const q = query(collection(db, 'loans'), where("borrowerId", "==", borrowerId), orderBy('startDate', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `loans where borrowerId == ${borrowerId}`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}


export async function updateLoan(db: Firestore, id: string, updates: Partial<Loan>): Promise<void> {
    const docRef = doc(db, 'loans', id);
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
