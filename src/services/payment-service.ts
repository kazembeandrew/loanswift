import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment } from '@/types';

const paymentsCollection = collection(db, 'payments');

export async function getPayments(): Promise<Payment[]> {
  const snapshot = await getDocs(paymentsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function getPaymentsByLoanId(loanId: string): Promise<Payment[]> {
    const q = query(paymentsCollection, where("loanId", "==", loanId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function addPayment(paymentData: Omit<Payment, 'id'>): Promise<string> {
  const docRef = await addDoc(paymentsCollection, paymentData);
  return docRef.id;
}
