import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Borrower } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

const borrowersCollection = collection(db, 'borrowers');

export async function getBorrowers(): Promise<Borrower[]> {
  const snapshot = await getDocs(borrowersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
}

export async function getBorrowerById(id: string): Promise<Borrower | null> {
    const docRef = doc(db, 'borrowers', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Borrower;
    }
    return null;
}

export async function addBorrower(borrowerData: Omit<Borrower, 'id' | 'joinDate'>): Promise<string> {
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

export async function updateBorrower(id: string, updates: Partial<Omit<Borrower, 'id' | 'joinDate'>>): Promise<void> {
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
