import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Income, Loan } from '@/types';
import { getLoanById, updateLoan } from './loan-service';

// Note: Payments are now a subcollection of a loan.

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
    
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    const totalPaidPreviously = allPaymentsForLoan.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = totalOwed - totalPaidPreviously;

    if (paymentData.amount > outstandingBalance) {
        throw new Error(`Payment of ${paymentData.amount} exceeds the outstanding balance of ${outstandingBalance}.`);
    }

    const interestOwed = totalOwed - loan.principal;
    
    const incomeRecords = collection(db, 'income');
    const q = query(incomeRecords, where("loanId", "==", loanId), where("source", "==", "interest"));
    const interestIncomeDocs = await getDocs(q);
    const interestPaidPreviously = interestIncomeDocs.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    const remainingInterest = interestOwed - interestPaidPreviously;
    const interestPortionOfPayment = Math.min(paymentData.amount, remainingInterest);
    
    const batch = writeBatch(db);

    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const newPaymentRef = doc(paymentsCollection);
    batch.set(newPaymentRef, paymentData);

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
    
    const newOutstandingBalance = outstandingBalance - paymentData.amount;
    updateLoan(loanId, { outstandingBalance: newOutstandingBalance });

    await batch.commit();
    return newPaymentRef.id;
}

export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'));
    const querySnapshot = await getDocs(paymentsQuery);
    const payments: (Payment & { loanId: string })[] = [];
    querySnapshot.forEach((doc) => {
        const loanDocRef = doc.ref.parent.parent;
        if (loanDocRef) {
            const loanId = loanDocRef.id;
            payments.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
        }
    });
    return payments;
}
