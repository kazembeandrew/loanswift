'use client';

import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, type Firestore } from 'firebase/firestore';
import type { Borrower } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


/**
 * Fetches all borrowers assigned to a specific loan officer.
 * @param db The Firestore instance.
 * @param loanOfficerId The UID of the loan officer.
 * @returns A promise that resolves to an array of borrowers.
 */
export async function getBorrowersByLoanOfficer(db: Firestore, loanOfficerId: string): Promise<Borrower[]> {
  const borrowersCollection = collection(db, 'borrowers');
  const q = query(borrowersCollection, where("loanOfficerId", "==", loanOfficerId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `borrowers where loanOfficerId == ${loanOfficerId}`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

/**
 * Fetches borrowers. If a loanOfficerId is provided, it fetches borrowers for that officer.
 * Otherwise, it fetches all borrowers (typically for admin views).
 * @param db The Firestore instance.
 * @param loanOfficerId Optional UID of the loan officer.
 * @returns A promise that resolves to an array of borrowers.
 */
export async function getBorrowers(db: Firestore, loanOfficerId?: string): Promise<Borrower[]> {
  if (loanOfficerId) {
    return getBorrowersByLoanOfficer(db, loanOfficerId);
  }

  const borrowersCollection = collection(db, 'borrowers');
  try {
    const snapshot = await getDocs(borrowersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: borrowersCollection.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function getBorrowerById(db: Firestore, id: string): Promise<Borrower | null> {
    const docRef = doc(db, 'borrowers', id);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Borrower;
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

export async function addBorrower(db: Firestore, borrowerData: Omit<Borrower, 'id' | 'joinDate'>): Promise<string> {
  const borrowersCollection = collection(db, 'borrowers');
  const fullBorrowerData = {
    ...borrowerData,
    joinDate: new Date().toISOString(),
  };
  const docRef = await addDoc(borrowersCollection, fullBorrowerData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: borrowersCollection.path,
            operation: 'create',
            requestResourceData: fullBorrowerData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });

  return docRef.id;
}

export async function updateBorrower(db: Firestore, id: string, updates: Partial<Omit<Borrower, 'id' | 'joinDate'>>): Promise<void> {
    const docRef = doc(db, 'borrowers', id);
    await updateDoc(docRef, updates)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
