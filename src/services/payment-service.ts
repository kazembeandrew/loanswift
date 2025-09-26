import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment } from '@/types';

// Note: Payments are now a subcollection of a loan.
// These functions will need to be updated to reflect that, taking loanId as a parameter.

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

// A function to get all payments for all loans might be needed for reporting.
export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const allPayments: (Payment & {loanId: string})[] = [];
    const loansSnapshot = await getDocs(collection(db, 'loans'));

    for (const loanDoc of loansSnapshot.docs) {
        const paymentsCollection = collection(db, `loans/${loanDoc.id}/payments`);
        const paymentsSnapshot = await getDocs(paymentsCollection);
        paymentsSnapshot.forEach(paymentDoc => {
            allPayments.push({ loanId: loanDoc.id, id: paymentDoc.id, ...paymentDoc.data() } as Payment & {loanId: string});
        });
    }
    
    return allPayments;
}
