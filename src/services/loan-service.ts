import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
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

export async function getLoansByCustomerId(customerId: string): Promise<Loan[]> {
    const q = query(loansCollection, where("customerId", "==", customerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
}

export async function addLoan(loanData: Omit<Loan, 'id'>): Promise<string> {
  const docRef = await addDoc(loansCollection, loanData);
  return docRef.id;
}
