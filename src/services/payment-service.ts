import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Income, Loan } from '@/types';
import { getLoanById } from './loan-service';

// Note: Payments are now a subcollection of a loan.

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
    const loan = await getLoanById(loanId);
    if (!loan) {
        throw new Error(`Loan with ID ${loanId} not found.`);
    }

    const allPaymentsForLoan = await getPaymentsByLoanId(loanId);
    const totalPaidPreviously = allPaymentsForLoan.reduce((sum, p) => sum + p.amount, 0);

    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    const interestOwed = totalOwed - loan.principal;
    
    // Logic to determine how much of this payment is principal vs. interest
    // This is a simplified approach. For more complex loans, amortization schedules would be needed.
    const incomeRecords = collection(db, 'income');
    const q = query(incomeRecords, where("loanId", "==", loanId), where("source", "==", "interest"));
    const interestIncomeDocs = await getDocs(q);
    const interestPaidPreviously = interestIncomeDocs.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    const remainingInterest = interestOwed - interestPaidPreviously;
    const interestPortionOfPayment = Math.min(paymentData.amount, remainingInterest);
    
    const batch = writeBatch(db);

    // 1. Add the payment document
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const newPaymentRef = doc(paymentsCollection);
    batch.set(newPaymentRef, paymentData);

    // 2. If there is an interest portion, create an income document
    if (interestPortionOfPayment > 0) {
        const incomeData: Omit<Income, 'id'> = {
            amount: interestPortionOfPayment,
            date: paymentData.date,
            source: 'interest',
            loanId: loanId,
        };
        const newIncomeRef = doc(collection(db, 'income'));
        batch.set(newIncomeRef, incomeData);
    }
    
    await batch.commit();
    return newPaymentRef.id;
}


// A function to get all payments for all loans is needed for reporting.
export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'));
    const querySnapshot = await getDocs(paymentsQuery);
    const payments: (Payment & { loanId: string })[] = [];
    querySnapshot.forEach((doc) => {
        // The parent property gives you a reference to the loan document.
        const loanDocRef = doc.ref.parent.parent;
        if (loanDocRef) {
            const loanId = loanDocRef.id;
            payments.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
        } else {
            console.warn(`Orphaned payment document found with ID: ${doc.id}. It has no parent loan.`);
        }
    });
    return payments;
}
