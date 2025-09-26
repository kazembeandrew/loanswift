import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Loan } from '@/types';

const loansCollection = collection(db, 'loans');

export async function getLoans(): Promise<Loan[]> {
  const snapshot = await getDocs(loansCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
}

export async function getLoanById(id: string): Promise<Loan | null> {
    const docRef = doc(db, 'loans', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Loan;
    }
    return null;
}

export async function getLoansByBorrowerId(borrowerId: string): Promise<Loan[]> {
    const q = query(loansCollection, where("borrowerId", "==", borrowerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
}

export async function addLoan(loanData: Omit<Loan, 'id'>): Promise<string> {
  const docRef = await addDoc(loansCollection, loanData);
  return docRef.id;
}

export async function updateLoan(id: string, updates: Partial<Loan>): Promise<void> {
    const docRef = doc(db, 'loans', id);
    await updateDoc(docRef, updates);
}
