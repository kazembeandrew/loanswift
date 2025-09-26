import { collection, addDoc, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
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
