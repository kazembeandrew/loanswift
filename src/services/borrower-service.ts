import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Borrower } from '@/types';

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
  const docRef = await addDoc(borrowersCollection, {
    ...borrowerData,
    joinDate: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateBorrower(id: string, updates: Partial<Omit<Borrower, 'id' | 'joinDate'>>): Promise<void> {
    const docRef = doc(db, 'borrowers', id);
    await updateDoc(docRef, updates);
}
