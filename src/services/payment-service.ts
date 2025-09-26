import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment } from '@/types';

// Note: Payments are now a subcollection of a loan.
// These functions will need to be updated to reflect that, taking loanId as a parameter.

export async function getPayments(loanId: string): Promise<Payment[]> {
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const snapshot = await getDocs(paymentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function getPaymentsByLoanId(loanId: string): Promise<Payment[]> {
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const snapshot = await getDocs(paymentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function addPayment(loanId: string, paymentData: Omit<Payment, 'id'>): Promise<string> {
  const paymentsCollection = collection(db, `loans/${loanId}/payments`);
  const docRef = await addDoc(paymentsCollection, paymentData);
  return docRef.id;
}

// A function to get all payments for all loans is needed for reporting.
export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'));
    const querySnapshot = await getDocs(paymentsQuery);
    const payments: (Payment & { loanId: string })[] = [];
    querySnapshot.forEach((doc) => {
        // The parent property gives you a reference to the loan document.
        const loanId = doc.ref.parent.parent!.id;
        payments.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
    });
    return payments;
}
